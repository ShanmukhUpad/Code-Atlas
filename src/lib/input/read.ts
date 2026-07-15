"use client";

import type { RawFile } from "@/types";
import { isCodeFile } from "@/lib/parse";

const MAX_FILES = 600;
const MAX_FILE_BYTES = 250_000;

// Directories we never descend into — skipping these before enumeration is the
// single biggest win for large projects (node_modules can be tens of thousands
// of files, and enumerating it on a synced drive takes forever).
const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "out",
  "coverage",
  ".turbo",
  ".vercel",
  ".cache",
  ".idea",
  ".vscode",
  "vendor",
  "__pycache__",
  ".venv",
  "venv",
]);

export interface Picked {
  path: string; // path as reported (may include a leading project folder)
  file: File;
}

/** Files chosen via a <input webkitdirectory> picker (fallback path). */
export function pickedFromInput(list: FileList): Picked[] {
  const out: Picked[] = [];
  for (const file of Array.from(list)) {
    const path =
      (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
      file.name;
    if (path.split("/").some((seg) => IGNORE_DIRS.has(seg))) continue;
    out.push({ path, file });
  }
  return out;
}

// ---- File System Access API (Chromium): traverse ourselves, pruning early ----

interface DirHandle {
  kind: "directory";
  name: string;
  entries: () => AsyncIterableIterator<[string, FileHandle | DirHandle]>;
}
interface FileHandle {
  kind: "file";
  name: string;
  getFile: () => Promise<File>;
}

export function supportsDirectoryPicker(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export async function openDirectoryPicker(): Promise<DirHandle> {
  const picker = (
    window as unknown as { showDirectoryPicker: (o?: unknown) => Promise<DirHandle> }
  ).showDirectoryPicker;
  return picker({ mode: "read" });
}

/**
 * Recursively collect only code files from a directory handle, pruning ignored
 * folders before descending. Reports the running count via `onScan`.
 */
export async function pickedFromDirectoryHandle(
  dir: DirHandle,
  onScan?: (found: number) => void,
): Promise<Picked[]> {
  const out: Picked[] = [];

  async function walk(handle: DirHandle, prefix: string): Promise<void> {
    for await (const [name, child] of handle.entries()) {
      if (child.kind === "directory") {
        if (IGNORE_DIRS.has(name)) continue;
        await walk(child, `${prefix}${name}/`);
      } else {
        const path = `${prefix}${name}`;
        if (!isCodeFile(path)) continue;
        const file = await child.getFile();
        if (file.size > MAX_FILE_BYTES) continue;
        out.push({ path, file });
        if (out.length % 8 === 0) onScan?.(out.length);
        if (out.length >= MAX_FILES * 2) return; // hard safety cap on scan
      }
    }
  }

  await walk(dir, "");
  onScan?.(out.length);
  return out;
}

// ---- Drag-and-drop (webkitGetAsEntry) — also pruned ----

interface FsEntry {
  name: string;
  isFile: boolean;
  isDirectory: boolean;
  fullPath: string;
  file: (cb: (f: File) => void, err: (e: unknown) => void) => void;
  createReader: () => {
    readEntries: (cb: (entries: FsEntry[]) => void, err: (e: unknown) => void) => void;
  };
}

export async function pickedFromDataTransfer(
  items: DataTransferItemList,
  onScan?: (found: number) => void,
): Promise<Picked[]> {
  const roots: FsEntry[] = [];
  for (const item of Array.from(items)) {
    const entry = item.webkitGetAsEntry?.() as unknown as FsEntry | null;
    if (entry) roots.push(entry);
  }

  const out: Picked[] = [];
  async function walk(entry: FsEntry): Promise<void> {
    if (entry.isDirectory && IGNORE_DIRS.has(entry.name)) return;
    if (entry.isFile) {
      const path = entry.fullPath.replace(/^\//, "");
      if (!isCodeFile(path)) return;
      const file = await new Promise<File>((res, rej) => entry.file(res, rej));
      out.push({ path, file });
      if (out.length % 8 === 0) onScan?.(out.length);
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      let batch: FsEntry[];
      do {
        batch = await new Promise<FsEntry[]>((res, rej) =>
          reader.readEntries(res, rej),
        );
        for (const e of batch) await walk(e);
      } while (batch.length > 0);
    }
  }
  for (const r of roots) await walk(r);
  onScan?.(out.length);
  return out;
}

/** Strip a common leading folder segment shared by every path. */
function stripCommonRoot(paths: string[]): { strip: number; root: string } {
  if (paths.length === 0) return { strip: 0, root: "project" };
  const first = paths[0].split("/")[0];
  const shared = paths.every((p) => p.split("/")[0] === first);
  return shared && paths.some((p) => p.includes("/"))
    ? { strip: first.length + 1, root: first }
    : { strip: 0, root: "project" };
}

export interface ReadOptions {
  onProgress?: (done: number, total: number) => void;
  /** When set, paths are already root-relative; use this as the project name. */
  rootName?: string;
}

/**
 * Read picked entries into RawFile[], filtering to code files and rooting paths.
 * Reads in batches so `onProgress(done, total)` can drive a real progress bar.
 */
export async function toRawFiles(
  picked: Picked[],
  opts: ReadOptions = {},
): Promise<{ files: RawFile[]; projectName: string; truncated: boolean }> {
  const { onProgress, rootName } = opts;
  const code = picked.filter(
    (p) => isCodeFile(p.path) && p.file.size <= MAX_FILE_BYTES,
  );
  const truncated = code.length > MAX_FILES;
  const selected = code.slice(0, MAX_FILES);

  const { strip, root } = rootName
    ? { strip: 0, root: rootName }
    : stripCommonRoot(selected.map((p) => p.path));

  const files: RawFile[] = [];
  const total = selected.length;
  let done = 0;
  onProgress?.(0, total);

  const BATCH = 24;
  for (let i = 0; i < selected.length; i += BATCH) {
    const batch = selected.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (p) => {
        const content = await p.file.text();
        files.push({ path: strip ? p.path.slice(strip) : p.path, content });
        done++;
        onProgress?.(done, total);
      }),
    );
  }

  return { files, projectName: root, truncated };
}
