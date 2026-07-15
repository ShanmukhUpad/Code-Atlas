import type { FileMeta, FolderMeta, NodeRole, ParsedFile, RawFile } from "@/types";
import { extractExports, extractHeader, extractImports, hasJsx } from "./imports";
import { resolveSpecifier } from "./resolve";
import {
  extractPyExports,
  extractPyHeader,
  extractPyImports,
  hasPyMain,
  resolvePyImport,
} from "./python";

export const CODE_EXT_RE = /\.(tsx?|jsx?|mjs|cjs|py)$/i;
const IGNORE_DIR_RE =
  /(^|\/)(node_modules|\.git|\.next|dist|build|out|coverage|\.turbo|\.vercel)(\/|$)/;

export function isCodeFile(path: string): boolean {
  return (
    CODE_EXT_RE.test(path) &&
    !IGNORE_DIR_RE.test(path) &&
    !/\.d\.ts$/i.test(path)
  );
}

function baseName(p: string): string {
  return p.slice(p.lastIndexOf("/") + 1);
}
function dirName(p: string): string {
  const i = p.lastIndexOf("/");
  return i === -1 ? "" : p.slice(0, i);
}
function extName(p: string): string {
  const b = baseName(p);
  const i = b.lastIndexOf(".");
  return i === -1 ? "" : b.slice(i);
}

const CONFIG_RE =
  /(^|\/)(next|tailwind|postcss|vite|vitest|jest|rollup|webpack|babel|eslint|prettier|tsup|drizzle)\.config\.|(^|\/)\.?[\w-]*rc(\.[jt]s)?$|(^|\/)middleware\.[jt]s$/i;
const ENTRY_NAME_RE =
  /^(page|layout|route|index|main|app|server|_app|_document|middleware)\.[jt]sx?$/i;

const PY_ENTRY_RE = /^(main|manage|app|wsgi|asgi|__main__|run)\.py$/i;
const PY_CONFIG_RE = /^(setup|settings|config|conf|conftest|urls)\.py$/i;

/** Parse a single file into its raw imports/exports/header. */
function parseFile(file: RawFile): ParsedFile {
  const { path, content } = file;
  const ext = extName(path);
  const common = {
    path,
    name: baseName(path),
    dir: dirName(path),
    ext,
    dependencies: [],
    externalImports: [],
    loc: content.split("\n").length,
  };

  if (ext === ".py") {
    return {
      ...common,
      lang: "py",
      imports: [],
      pyImports: extractPyImports(content),
      exports: extractPyExports(content),
      hasJsx: false,
      hasMain: hasPyMain(content),
      header: extractPyHeader(content),
    };
  }

  return {
    ...common,
    lang: "js",
    imports: extractImports(content),
    exports: extractExports(content),
    hasJsx: hasJsx(content),
    header: extractHeader(content),
  };
}

function classifyRole(f: ParsedFile, fanIn: number, fanOut: number): NodeRole {
  if (f.lang === "py") {
    if (f.hasMain || PY_ENTRY_RE.test(f.name)) return "entry";
    if (PY_CONFIG_RE.test(f.name)) return "config";
    if (/^test_|_test\.py$/i.test(f.name) || /(^|\/)tests?\//i.test(f.path))
      return "util";
    if (fanIn >= 4 && fanIn >= fanOut) return "hub";
    if (fanOut >= 6) return "orchestrator";
    if (fanIn === 0 && fanOut === 0) return "file";
    return "util";
  }

  if (CONFIG_RE.test(f.path) || f.ext === ".json") return "config";
  if (ENTRY_NAME_RE.test(f.name)) return "entry";
  if (fanIn >= 4 && fanIn >= fanOut) return "hub";
  if (f.hasJsx || /\/components?\//i.test(f.path)) return "component";
  if (fanOut >= 5) return "orchestrator";
  if (fanIn === 0 && fanOut === 0) return "file";
  return "util";
}

export interface ParsedProject {
  files: FileMeta[];
  folders: FolderMeta[];
  byPath: Map<string, FileMeta>;
}

/** Parse a whole project: resolve dependencies, compute metrics + roles. */
export function parseProject(rawFiles: RawFile[]): ParsedProject {
  const codeFiles = rawFiles.filter((f) => isCodeFile(f.path));
  const parsed = codeFiles.map(parseFile);
  const fileSet = new Set(parsed.map((p) => p.path));

  // Resolve dependencies + accumulate dependents.
  const dependents = new Map<string, string[]>();
  for (const p of parsed) {
    const deps = new Set<string>();
    const external: string[] = [];
    if (p.lang === "py") {
      for (const imp of p.pyImports ?? []) {
        const { deps: d, external: ext } = resolvePyImport(imp, p.path, fileSet);
        for (const x of d) if (x !== p.path) deps.add(x);
        if (ext) external.push(ext);
      }
    } else {
      for (const spec of p.imports) {
        const resolved = resolveSpecifier(spec, p.path, fileSet);
        if (resolved && resolved !== p.path) deps.add(resolved);
        else if (!resolved) external.push(spec);
      }
    }
    p.dependencies = [...deps];
    p.externalImports = [...new Set(external)];
    for (const d of deps) {
      const list = dependents.get(d) ?? [];
      list.push(p.path);
      dependents.set(d, list);
    }
  }

  const files: FileMeta[] = parsed.map((p) => {
    const deps = dependents.get(p.path) ?? [];
    const fanIn = deps.length;
    const fanOut = p.dependencies.length;
    return {
      ...p,
      dependents: deps,
      fanIn,
      fanOut,
      role: classifyRole(p, fanIn, fanOut),
    };
  });

  const byPath = new Map(files.map((f) => [f.path, f]));
  const folders = buildFolders(files);
  return { files, folders, byPath };
}

/** Aggregate files into folder metadata (every ancestor directory). */
function buildFolders(files: FileMeta[]): FolderMeta[] {
  const map = new Map<string, FileMeta[]>();
  for (const f of files) {
    // register this file against every ancestor directory
    const segs = f.dir === "" ? [] : f.dir.split("/");
    for (let i = 1; i <= segs.length; i++) {
      const dir = segs.slice(0, i).join("/");
      const list = map.get(dir) ?? [];
      list.push(f);
      map.set(dir, list);
    }
    // include the root bucket
    const root = map.get("") ?? [];
    root.push(f);
    map.set("", root);
  }

  const folders: FolderMeta[] = [];
  for (const [path, group] of map) {
    if (path === "") continue; // root handled by canvas background
    const keyFiles = [...group]
      .sort((a, b) => b.fanIn - a.fanIn)
      .slice(0, 3)
      .map((f) => f.path);
    folders.push({
      path,
      name: baseName(path) || path,
      fileCount: group.length,
      childFiles: group.map((f) => f.path),
      keyFiles,
    });
  }
  return folders;
}
