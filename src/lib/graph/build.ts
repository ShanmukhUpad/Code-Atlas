import type { Edge, Node } from "@xyflow/react";
import type { AtlasNodeData, FileMeta, FileNodeData, FolderNodeData } from "@/types";
import { layoutTree, NODE_H, NODE_W } from "./layout";
import { ROOT, type DirTree } from "./tree";

export interface AtlasGraph {
  nodes: Node<AtlasNodeData>[];
  edges: Edge[];
}

export const FOLDER_W = 176;
export const FOLDER_H = 92;

export interface DepEdge {
  from: string;
  to: string;
}

export interface VisibleArgs {
  tree: DirTree;
  filesByPath: Record<string, FileMeta>;
  depEdges: DepEdge[];
  expanded: Record<string, boolean>;
  projectName: string;
}

const folderId = (dir: string) => `dir:${dir}`;

/**
 * Compute the currently-visible graph for a set of expanded folders. Only the
 * root shows initially; expanding a folder reveals its direct children. Files
 * appear when their parent folder is expanded, and dependency edges are drawn
 * between whichever files are currently on screen.
 */
export function buildVisibleGraph({
  tree,
  filesByPath,
  depEdges,
  expanded,
  projectName,
}: VisibleArgs): AtlasGraph {
  const visibleDirs = new Set<string>([ROOT]);
  const visibleFiles = new Set<string>();
  const branch: DepEdge[] = [];

  // BFS from root, descending only into expanded folders.
  const queue = [ROOT];
  while (queue.length) {
    const dir = queue.shift()!;
    if (!expanded[dir]) continue;
    const node = tree.dirs[dir];
    if (!node) continue;
    for (const cd of node.childDirs) {
      if (!visibleDirs.has(cd)) {
        visibleDirs.add(cd);
        queue.push(cd);
      }
      branch.push({ from: folderId(dir), to: folderId(cd) });
    }
    for (const cf of node.childFiles) {
      visibleFiles.add(cf);
      branch.push({ from: folderId(dir), to: cf });
    }
  }

  // Layout (containment edges only → clean tree).
  const lnodes = [
    ...[...visibleDirs].map((d) => ({
      id: folderId(d),
      width: FOLDER_W,
      height: FOLDER_H,
    })),
    ...[...visibleFiles].map((f) => ({ id: f, width: NODE_W, height: NODE_H })),
  ];
  const pos = layoutTree(lnodes, branch);

  const nodes: Node<AtlasNodeData>[] = [];

  for (const dir of visibleDirs) {
    const dn = tree.dirs[dir];
    const p = pos.get(folderId(dir))!;
    const data: FolderNodeData = {
      kind: "folder",
      path: dir,
      label: dir === ROOT ? projectName : dn.name,
      fileCount: dn.descendantFiles,
      expanded: !!expanded[dir],
      hasChildren: dn.childDirs.length + dn.childFiles.length > 0,
    };
    nodes.push({
      id: folderId(dir),
      type: "folder",
      position: p,
      data,
      draggable: false,
      zIndex: 2,
    });
  }

  for (const fp of visibleFiles) {
    const f = filesByPath[fp];
    if (!f) continue;
    const p = pos.get(fp)!;
    const data: FileNodeData = {
      kind: "file",
      path: fp,
      label: f.name,
      role: f.role,
      fanIn: f.fanIn,
      fanOut: f.fanOut,
      ext: f.ext,
    };
    nodes.push({ id: fp, type: "file", position: p, data, zIndex: 3 });
  }

  // Edges: containment branches + dependency cross-links among visible files.
  const edges: Edge[] = [];
  branch.forEach((e, i) =>
    edges.push({
      id: `b${i}-${e.from}>${e.to}`,
      source: e.from,
      target: e.to,
      type: "skill",
      data: { variant: "branch" },
      zIndex: 1,
    }),
  );
  depEdges.forEach((e, i) => {
    if (visibleFiles.has(e.from) && visibleFiles.has(e.to))
      edges.push({
        id: `d${i}-${e.from}>${e.to}`,
        source: e.from,
        target: e.to,
        type: "skill",
        data: { variant: "dep" },
        zIndex: 1,
      });
  });

  return { nodes, edges };
}
