import type { Explanation, FileMeta, FolderMeta } from "@/types";
import { useAtlas } from "@/store";
import { explainFile, explainFolder } from "./heuristic";
import { saveCacheEntry } from "./cache";
import type { ExplainItem, ExplainResult } from "./prompt";

const shortNames = (paths: string[]) =>
  paths.map((p) => p.slice(p.lastIndexOf("/") + 1));

function toItem(
  path: string,
  filesByPath: Record<string, FileMeta>,
  foldersByPath: Record<string, FolderMeta>,
): ExplainItem | null {
  const file = filesByPath[path];
  if (file) {
    return {
      path,
      kind: "file",
      name: file.name,
      role: file.role,
      dir: file.dir,
      exports: file.exports.slice(0, 12),
      dependencies: shortNames(file.dependencies).slice(0, 20),
      dependents: shortNames(file.dependents).slice(0, 20),
      header: file.header,
    };
  }
  const folder = foldersByPath[path];
  if (folder) {
    return {
      path,
      kind: "folder",
      name: folder.name,
      fileCount: folder.fileCount,
      keyFiles: shortNames(folder.keyFiles),
    };
  }
  return null;
}

/** Compute (and cache) the instant heuristic explanation for a path. */
export function ensureHeuristic(path: string): Explanation | null {
  const s = useAtlas.getState();
  const cached = s.explanations[path];
  if (cached) return cached;
  const file = s.filesByPath[path];
  if (file) {
    const exp = explainFile(file);
    s.setExplanation(exp);
    return exp;
  }
  const folder = s.foldersByPath[path];
  if (folder) {
    const exp = explainFolder(folder, s.filesByPath);
    s.setExplanation(exp);
    return exp;
  }
  return null;
}

let warmed = false;

/** Preload the local model once when the atlas opens, so the first click is fast. */
export function warmModel(): void {
  if (warmed) return;
  warmed = true;
  fetch("/api/explain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ warmup: true }),
  }).catch(() => {});
}

const aiRequested = new Set<string>();

/**
 * Try to upgrade a path's explanation with AI. No-ops (keeping the heuristic)
 * when no API key is configured or the request fails.
 */
export async function requestAi(path: string): Promise<void> {
  if (aiRequested.has(path)) return;
  aiRequested.add(path);
  const s = useAtlas.getState();
  if (s.explanations[path]?.source === "ai") return;

  const item = toItem(path, s.filesByPath, s.foldersByPath);
  if (!item) return;

  s.setAiLoading(path, true);
  try {
    const res = await fetch("/api/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [item] }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as {
      disabled?: boolean;
      items?: ExplainResult[];
    };
    if (data.disabled || !data.items?.length) return;
    const project = useAtlas.getState().projectName;
    for (const r of data.items) {
      const exp: Explanation = { ...r, path: r.path, source: "ai" };
      useAtlas.getState().setExplanation(exp);
      saveCacheEntry(project, exp);
    }
  } catch {
    // network/parse failure — heuristic stays in place.
  } finally {
    useAtlas.getState().setAiLoading(path, false);
  }
}
