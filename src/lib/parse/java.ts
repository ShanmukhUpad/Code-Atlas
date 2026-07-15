// Lightweight extraction of package/imports + top-level types from Java.
// Dependencies come from `import a.b.C;` — resolved to a project file whose
// path ends with `a/b/C.java` (so any source root like src/main/java works).

export interface JavaComponents {
  /** Declared package, e.g. "com.acme.core" (empty for the default package). */
  pkg: string;
  /** Imported fully-qualified names; a trailing "*" marks a wildcard import. */
  imports: string[];
  /** Public type names declared here (classes, interfaces, enums, records). */
  exports: string[];
  hasMain: boolean;
}

const PACKAGE_RE = /^[ \t]*package\s+([\w.]+)\s*;/m;
const IMPORT_RE = /^[ \t]*import\s+(?:static\s+)?([\w.]+(?:\.\*)?)\s*;/gm;
const TYPE_RE =
  /\b(?:public\s+|protected\s+|private\s+)?(?:final\s+|abstract\s+|sealed\s+|static\s+)*(?:class|interface|enum|record)\s+([A-Za-z_]\w*)/g;
const MAIN_RE = /\bstatic\s+void\s+main\s*\(/;

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

export function extractJavaComponents(content: string): JavaComponents {
  const src = stripComments(content);
  const pkg = PACKAGE_RE.exec(src)?.[1] ?? "";
  const imports = new Set<string>();
  const exports = new Set<string>();
  let m: RegExpExecArray | null;

  IMPORT_RE.lastIndex = 0;
  while ((m = IMPORT_RE.exec(src)) !== null) imports.add(m[1]);

  TYPE_RE.lastIndex = 0;
  while ((m = TYPE_RE.exec(src)) !== null) exports.add(m[1]);

  return {
    pkg,
    imports: [...imports],
    exports: [...exports],
    hasMain: MAIN_RE.test(src),
  };
}

/**
 * Resolve a Java import to project file(s). `a.b.C` matches a file ending in
 * `a/b/C.java`; `a.b.*` matches every project file in package `a/b`. Returns the
 * matched paths, or reports the top-level package as external when none match.
 */
export function resolveJavaImport(
  name: string,
  fileSet: Set<string>,
): { deps: string[]; external: string | null } {
  const deps: string[] = [];
  if (name.endsWith(".*")) {
    const dir = name.slice(0, -2).replace(/\./g, "/");
    for (const p of fileSet) {
      const cut = p.lastIndexOf("/");
      if (cut !== -1 && p.slice(0, cut).endsWith(dir)) deps.push(p);
    }
  } else {
    const suffix = name.replace(/\./g, "/") + ".java";
    for (const p of fileSet) {
      if (p === suffix || p.endsWith("/" + suffix)) deps.push(p);
    }
  }
  const external = deps.length === 0 ? name.split(".")[0] : null;
  return { deps, external };
}
