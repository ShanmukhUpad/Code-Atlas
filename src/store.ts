import { create } from "zustand";
import type { Edge, Node } from "@xyflow/react";
import type {
  AtlasNodeData,
  Explanation,
  FileMeta,
  FolderMeta,
  RawFile,
} from "@/types";
import { parseProject } from "@/lib/parse";
import { buildVisibleGraph, type DepEdge } from "@/lib/graph/build";
import { buildTree, ROOT, type DirTree } from "@/lib/graph/tree";
import { loadCache } from "@/lib/explain/cache";

type Status = "idle" | "loading" | "ready" | "error";

interface AtlasState {
  status: Status;
  error: string | null;
  projectName: string;

  nodes: Node<AtlasNodeData>[];
  edges: Edge[];
  filesByPath: Record<string, FileMeta>;
  foldersByPath: Record<string, FolderMeta>;
  fileCount: number;

  // hierarchy / drill-down
  tree: DirTree | null;
  depEdges: DepEdge[];
  expanded: Record<string, boolean>;

  selectedPath: string | null;
  hoveredPath: string | null;
  explanations: Record<string, Explanation>;
  aiLoading: Record<string, boolean>;

  musicOn: boolean;
  muted: boolean;

  loadFromRawFiles: (files: RawFile[], projectName: string) => void;
  setStatus: (status: Status, error?: string | null) => void;
  reset: () => void;
  toggleExpand: (dir: string) => void;
  revealPath: (path: string) => void;
  select: (path: string | null) => void;
  hover: (path: string | null) => void;
  setExplanation: (exp: Explanation) => void;
  setExplanations: (exps: Explanation[]) => void;
  setAiLoading: (path: string, loading: boolean) => void;
  toggleMusic: () => void;
  toggleMute: () => void;
}

const emptyGraph = {
  nodes: [] as Node<AtlasNodeData>[],
  edges: [] as Edge[],
};

/** Recompute visible nodes/edges from the current tree + expanded set. */
function recompute(s: AtlasState): { nodes: Node<AtlasNodeData>[]; edges: Edge[] } {
  if (!s.tree) return emptyGraph;
  return buildVisibleGraph({
    tree: s.tree,
    filesByPath: s.filesByPath,
    depEdges: s.depEdges,
    expanded: s.expanded,
    projectName: s.projectName,
  });
}

export const useAtlas = create<AtlasState>((set, get) => ({
  status: "idle",
  error: null,
  projectName: "",
  nodes: [],
  edges: [],
  filesByPath: {},
  foldersByPath: {},
  fileCount: 0,
  tree: null,
  depEdges: [],
  expanded: {},
  selectedPath: null,
  hoveredPath: null,
  explanations: {},
  aiLoading: {},
  musicOn: false,
  muted: false,

  loadFromRawFiles: (files, projectName) => {
    const project = parseProject(files);
    if (project.files.length === 0) {
      set({
        status: "error",
        error: "No supported source files were found in that project.",
      });
      return;
    }

    const filesByPath = Object.fromEntries(
      project.files.map((f) => [f.path, f]),
    );
    const depEdges: DepEdge[] = [];
    for (const f of project.files)
      for (const dep of f.dependencies) depEdges.push({ from: dep, to: f.path });

    const tree = buildTree(project.files, projectName);

    // Folder metadata keyed by path, plus a synthetic root entry.
    const foldersByPath: Record<string, FolderMeta> = Object.fromEntries(
      project.folders.map((f) => [f.path, f]),
    );
    foldersByPath[ROOT] = {
      path: ROOT,
      name: projectName,
      fileCount: project.files.length,
      childFiles: project.files.map((f) => f.path),
      keyFiles: [...project.files]
        .sort((a, b) => b.fanIn - a.fanIn)
        .slice(0, 4)
        .map((f) => f.path),
    };

    // Start collapsed: only the root folder is visible.
    const expanded: Record<string, boolean> = {};
    const graph = buildVisibleGraph({
      tree,
      filesByPath,
      depEdges,
      expanded,
      projectName,
    });

    set({
      status: "ready",
      error: null,
      projectName,
      nodes: graph.nodes,
      edges: graph.edges,
      filesByPath,
      foldersByPath,
      fileCount: project.files.length,
      tree,
      depEdges,
      expanded,
      selectedPath: null,
      hoveredPath: null,
      // Restore previously-generated AI explanations for this project.
      explanations: loadCache(projectName),
    });
  },

  toggleExpand: (dir) => {
    const s = get();
    if (!s.tree) return;
    const expanded = { ...s.expanded, [dir]: !s.expanded[dir] };
    const next: AtlasState = { ...s, expanded };
    const graph = recompute(next);
    set({ expanded, nodes: graph.nodes, edges: graph.edges });
  },

  // Expand every ancestor folder of a file so it becomes visible, then select it.
  revealPath: (path) => {
    const s = get();
    if (!s.tree) {
      set({ selectedPath: path });
      return;
    }
    const expanded: Record<string, boolean> = { ...s.expanded, [ROOT]: true };
    const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
    if (dir) {
      const parts = dir.split("/");
      for (let i = 0; i < parts.length; i++)
        expanded[parts.slice(0, i + 1).join("/")] = true;
    }
    const graph = recompute({ ...s, expanded });
    set({
      expanded,
      nodes: graph.nodes,
      edges: graph.edges,
      selectedPath: path,
    });
  },

  setStatus: (status, error = null) => set({ status, error }),
  reset: () =>
    set({
      status: "idle",
      error: null,
      projectName: "",
      nodes: [],
      edges: [],
      filesByPath: {},
      foldersByPath: {},
      fileCount: 0,
      tree: null,
      depEdges: [],
      expanded: {},
      selectedPath: null,
      hoveredPath: null,
      explanations: {},
    }),

  select: (path) => set({ selectedPath: path }),
  hover: (path) => set({ hoveredPath: path }),
  setExplanation: (exp) =>
    set((s) => ({ explanations: { ...s.explanations, [exp.path]: exp } })),
  setExplanations: (exps) =>
    set((s) => {
      const next = { ...s.explanations };
      for (const e of exps) next[e.path] = e;
      return { explanations: next };
    }),
  setAiLoading: (path, loading) =>
    set((s) => ({ aiLoading: { ...s.aiLoading, [path]: loading } })),
  toggleMusic: () => set((s) => ({ musicOn: !s.musicOn })),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
}));
