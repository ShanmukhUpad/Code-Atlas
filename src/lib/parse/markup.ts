// Parsers for HTML and CMake — both reference other project files by path.

import { normalizePath } from "./resolve";

/** True for links that point outside the project (URLs, anchors, data URIs). */
function isExternalRef(spec: string): boolean {
  return (
    /^(?:[a-z]+:)?\/\//i.test(spec) || // http://, https://, //cdn…
    /^(?:mailto:|tel:|data:|javascript:|#)/i.test(spec) ||
    spec.trim() === ""
  );
}

/** Local `src`/`href` targets referenced by an HTML document. */
export function extractHtmlRefs(content: string): string[] {
  const refs = new Set<string>();
  const attrRe = /\b(?:src|href)\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(content)) !== null) {
    const spec = m[1].split(/[?#]/)[0];
    if (!isExternalRef(spec)) refs.add(spec);
  }
  return [...refs];
}

/** Resolve an HTML `src`/`href` to a project file (relative, with sensible fallbacks). */
export function resolveHtmlRef(
  spec: string,
  fromPath: string,
  fileSet: Set<string>,
): string | null {
  const dir = fromPath.includes("/")
    ? fromPath.slice(0, fromPath.lastIndexOf("/"))
    : "";
  const base = spec.startsWith("/")
    ? normalizePath(spec.slice(1))
    : normalizePath(`${dir}/${spec}`);
  for (const cand of [base, `${base}/index.html`, `${base}.html`]) {
    if (fileSet.has(cand)) return cand;
  }
  return null;
}

export interface CmakeComponents {
  /** `add_subdirectory(dir)` targets. */
  subdirs: string[];
  /** `include(file)` targets. */
  includes: string[];
  /** Declared build targets (`add_executable`/`add_library` names) — the "exports". */
  targets: string[];
}

export function extractCmake(content: string): CmakeComponents {
  const src = content.replace(/#[^\n]*/g, ""); // strip line comments
  const subdirs = new Set<string>();
  const includes = new Set<string>();
  const targets = new Set<string>();
  let m: RegExpExecArray | null;

  const subRe = /\badd_subdirectory\s*\(\s*([^\s)]+)/gi;
  while ((m = subRe.exec(src)) !== null) subdirs.add(m[1].replace(/["']/g, ""));

  const incRe = /\binclude\s*\(\s*([^\s)]+)/gi;
  while ((m = incRe.exec(src)) !== null) includes.add(m[1].replace(/["']/g, ""));

  const tgtRe = /\badd_(?:executable|library)\s*\(\s*([A-Za-z0-9_]+)/gi;
  while ((m = tgtRe.exec(src)) !== null) targets.add(m[1]);

  return { subdirs: [...subdirs], includes: [...includes], targets: [...targets] };
}

/** Resolve a CMake `add_subdirectory`/`include` target to a project file. */
export function resolveCmakeRef(
  spec: string,
  fromPath: string,
  fileSet: Set<string>,
): string | null {
  const dir = fromPath.includes("/")
    ? fromPath.slice(0, fromPath.lastIndexOf("/"))
    : "";
  const rel = spec.startsWith("/") ? normalizePath(spec.slice(1)) : `${dir}/${spec}`;
  const cands = [
    `${rel}/CMakeLists.txt`,
    rel,
    `${rel}.cmake`,
    spec,
    `${spec}.cmake`,
  ].map((c) => normalizePath(c));
  for (const c of cands) if (fileSet.has(c)) return c;
  return null;
}
