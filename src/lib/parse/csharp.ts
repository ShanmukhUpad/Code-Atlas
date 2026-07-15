// Lightweight extraction of types + references from C# (incl. Unity scripts).
// C# dependencies are name-based (types are resolved by name across the project,
// not by file path), so — like SystemVerilog — resolution is registry-driven:
// declared type names build a name->file map, and PascalCase references that hit
// that map become edges. `using` directives only drive external-library labeling.

export interface CsComponents {
  /** Declared type names (class/struct/interface/enum/record) — this file's exports. */
  defines: string[];
  /** Declared namespaces, used to tell internal `using`s from external ones. */
  namespaces: string[];
  /** `using X.Y;` directives (fully-qualified). */
  usings: string[];
  /** Referenced type-name candidates (PascalCase idents); registry-gated later. */
  refs: string[];
}

const NAMESPACE_RE = /\bnamespace\s+([\w.]+)/g;
const USING_RE = /^[ \t]*(?:global\s+)?using\s+(?:static\s+)?([\w.]+)\s*;/gm;
const TYPE_RE =
  /\b(?:public|internal|private|protected|sealed|abstract|static|partial)\s+(?:[\w]+\s+)*?(?:class|struct|interface|enum|record)\s+([A-Za-z_]\w*)/g;
// Fallback for types with no modifier (e.g. a bare `class Foo`).
const TYPE_BARE_RE = /\b(?:class|struct|interface|enum|record)\s+([A-Za-z_]\w*)/g;
const REF_RE = /\b([A-Z][A-Za-z0-9_]*)\b/g;

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1")
    // string literals can hold capitalized words that aren't type refs
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/@"[^"]*"/g, '""');
}

export function extractCsComponents(content: string): CsComponents {
  const src = stripComments(content);
  const defines = new Set<string>();
  const namespaces = new Set<string>();
  const usings = new Set<string>();
  const refs = new Set<string>();
  let m: RegExpExecArray | null;

  NAMESPACE_RE.lastIndex = 0;
  while ((m = NAMESPACE_RE.exec(src)) !== null) namespaces.add(m[1]);

  USING_RE.lastIndex = 0;
  while ((m = USING_RE.exec(src)) !== null) usings.add(m[1]);

  TYPE_RE.lastIndex = 0;
  while ((m = TYPE_RE.exec(src)) !== null) defines.add(m[1]);
  TYPE_BARE_RE.lastIndex = 0;
  while ((m = TYPE_BARE_RE.exec(src)) !== null) defines.add(m[1]);

  REF_RE.lastIndex = 0;
  while ((m = REF_RE.exec(src)) !== null) refs.add(m[1]);

  return {
    defines: [...defines],
    namespaces: [...namespaces],
    usings: [...usings],
    refs: [...refs],
  };
}
