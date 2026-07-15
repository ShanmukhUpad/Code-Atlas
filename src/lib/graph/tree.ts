import type { FileMeta } from "@/types";

/** Sentinel path for the project root folder (truthy, never collides). */
export const ROOT = ".";

export interface DirNode {
  path: string;
  name: string;
  childDirs: string[];
  childFiles: string[];
  /** total files anywhere beneath this folder */
  descendantFiles: number;
}

export interface DirTree {
  root: string;
  dirs: Record<string, DirNode>;
}

function baseName(p: string): string {
  return p.slice(p.lastIndexOf("/") + 1);
}

export function parentDir(p: string): string | null {
  if (p === ROOT) return null;
  const i = p.lastIndexOf("/");
  return i === -1 ? ROOT : p.slice(0, i);
}

/** Build a folder hierarchy (with per-folder descendant counts) from files. */
export function buildTree(files: FileMeta[], projectName: string): DirTree {
  const dirs: Record<string, DirNode> = {};
  const ensure = (path: string, name: string): DirNode => {
    if (!dirs[path])
      dirs[path] = {
        path,
        name,
        childDirs: [],
        childFiles: [],
        descendantFiles: 0,
      };
    return dirs[path];
  };
  ensure(ROOT, projectName || "project");

  for (const f of files) {
    const dir = f.dir === "" ? ROOT : f.dir;
    // ensure every ancestor exists and is linked to its parent
    if (dir !== ROOT) {
      const parts = dir.split("/");
      for (let i = 0; i < parts.length; i++) {
        const path = parts.slice(0, i + 1).join("/");
        ensure(path, parts[i]);
        const parent = i === 0 ? ROOT : parts.slice(0, i).join("/");
        if (!dirs[parent].childDirs.includes(path))
          dirs[parent].childDirs.push(path);
      }
    }
    dirs[dir].childFiles.push(f.path);
  }

  // descendant file counts: walk each file's dir up to the root
  for (const f of files) {
    let d: string | null = f.dir === "" ? ROOT : f.dir;
    while (d) {
      dirs[d].descendantFiles++;
      d = parentDir(d);
    }
  }

  // stable ordering keeps layout deterministic across expands
  for (const d of Object.values(dirs)) {
    d.childDirs.sort();
    d.childFiles.sort((a, b) => baseName(a).localeCompare(baseName(b)));
  }
  return { root: ROOT, dirs };
}
