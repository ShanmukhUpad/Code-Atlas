// Lightweight extraction of includes + top-level definitions from C / C++.
// Dependencies are `#include`-based (path-driven, like SystemVerilog's `include):
// quoted includes point at project files; angle-bracket includes are system/lib.

import { normalizePath } from "./resolve";

export interface CInclude {
  spec: string;
  /** true for `#include <…>` (system/library), false for `#include "…"`. */
  system: boolean;
}

export interface CComponents {
  includes: CInclude[];
  /** Top-level definition names (functions, classes, structs…) for display. */
  exports: string[];
  hasMain: boolean;
}

const INCLUDE_RE = /^[ \t]*#\s*include\s*(?:"([^"]+)"|<([^>]+)>)/gm;
const TYPE_RE =
  /\b(?:class|struct|union|enum(?:\s+class)?|namespace)\s+([A-Za-z_]\w*)/g;
// A function definition: return type(s) then name(args) then `{` (has a body).
const FUNC_RE =
  /^[A-Za-z_][\w\s\*&:<>,~]*?\b([A-Za-z_]\w*)\s*\([^;{)]*\)\s*(?:const\s*)?(?:noexcept\s*)?\{/gm;
const FUNC_SKIP = new Set([
  "if", "for", "while", "switch", "return", "sizeof", "catch", "do", "else",
]);

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

export function extractCComponents(content: string): CComponents {
  const src = stripComments(content);
  const includes: CInclude[] = [];
  const exports = new Set<string>();
  let m: RegExpExecArray | null;

  INCLUDE_RE.lastIndex = 0;
  while ((m = INCLUDE_RE.exec(src)) !== null) {
    if (m[1] != null) includes.push({ spec: m[1], system: false });
    else includes.push({ spec: m[2], system: true });
  }

  TYPE_RE.lastIndex = 0;
  while ((m = TYPE_RE.exec(src)) !== null) exports.add(m[1]);

  FUNC_RE.lastIndex = 0;
  while ((m = FUNC_RE.exec(src)) !== null) {
    if (!FUNC_SKIP.has(m[1])) exports.add(m[1]);
  }

  const hasMain = /\b(?:int|void)\s+main\s*\(/.test(src);
  return { includes: [...includes], exports: [...exports], hasMain };
}

/**
 * Resolve a quoted `#include "…"` to a project file: relative to the including
 * file first, then by basename against the set of C/C++ files (include search
 * paths live outside the source, so basenames are common).
 */
export function resolveCInclude(
  spec: string,
  fromPath: string,
  fileSet: Set<string>,
): string | null {
  const dir = fromPath.includes("/")
    ? fromPath.slice(0, fromPath.lastIndexOf("/"))
    : "";
  const rel = normalizePath(`${dir}/${spec}`);
  if (fileSet.has(rel)) return rel;
  if (fileSet.has(spec)) return spec;
  const base = spec.slice(spec.lastIndexOf("/") + 1);
  for (const p of fileSet) {
    if (p.slice(p.lastIndexOf("/") + 1) === base) return p;
  }
  return null;
}
