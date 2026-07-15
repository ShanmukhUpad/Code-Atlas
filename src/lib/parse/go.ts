// Lightweight extraction of imports + exported identifiers from Go.
// A Go import is a package *path*; the last segments name a directory of the
// module, so imports resolve to the project directory whose path ends with the
// import path (every .go file in that package becomes a dependency).

export interface GoComponents {
  /** Imported package paths. */
  imports: string[];
  /** Exported (capitalized) top-level identifiers — this file's "exports". */
  exports: string[];
  /** `package main` with a `func main()`. */
  hasMain: boolean;
}

const BLOCK_RE = /\bimport\s*\(([\s\S]*?)\)/g;
const PATH_RE = /(?:[\w.]+\s+)?"([^"]+)"/g;
const SINGLE_RE = /^[ \t]*import\s+(?:[\w.]+\s+)?"([^"]+)"/gm;
const FUNC_RE = /^func\s+(?:\([^)]*\)\s*)?([A-Z]\w*)/gm;
const TYPE_RE = /^type\s+([A-Z]\w*)/gm;
const DECL_RE = /^(?:const|var)\s+([A-Z]\w*)/gm;

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

export function extractGoComponents(content: string): GoComponents {
  const src = stripComments(content);
  const imports = new Set<string>();
  const exports = new Set<string>();
  let m: RegExpExecArray | null;

  BLOCK_RE.lastIndex = 0;
  while ((m = BLOCK_RE.exec(src)) !== null) {
    const body = m[1];
    PATH_RE.lastIndex = 0;
    let p: RegExpExecArray | null;
    while ((p = PATH_RE.exec(body)) !== null) imports.add(p[1]);
  }
  SINGLE_RE.lastIndex = 0;
  while ((m = SINGLE_RE.exec(src)) !== null) imports.add(m[1]);

  for (const re of [FUNC_RE, TYPE_RE, DECL_RE]) {
    re.lastIndex = 0;
    while ((m = re.exec(src)) !== null) exports.add(m[1]);
  }

  const hasMain = /\bpackage\s+main\b/.test(src) && /\bfunc\s+main\s*\(/.test(src);
  return { imports: [...imports], exports: [...exports], hasMain };
}

/**
 * Resolve a Go import path to project file(s): the package directory whose path
 * matches the tail of the import path. Returns every .go file in that package,
 * or reports the path as external (stdlib / third-party) when nothing matches.
 */
export function resolveGoImport(
  path: string,
  goDirs: Map<string, string[]>,
): { deps: string[]; external: string | null } {
  for (const [dir, files] of goDirs) {
    if (dir && (path === dir || path.endsWith("/" + dir))) {
      return { deps: files, external: null };
    }
  }
  return { deps: [], external: path };
}
