// Resolve an import specifier to an actual project file path — handles relative
// paths AND common TS/Next path aliases (@/…, ~/…, baseUrl bare imports).

const CODE_EXTS = [
  "",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  "/index.ts",
  "/index.tsx",
  "/index.js",
  "/index.jsx",
];

/** Base prefixes tried for alias / baseUrl imports (most projects root here). */
const BASE_PREFIXES = ["", "src/", "app/", "src/app/", "lib/", "src/lib/"];

/** Normalize a POSIX path, collapsing "." and ".." segments. */
export function normalizePath(p: string): string {
  const parts = p.split("/");
  const out: string[] = [];
  for (const part of parts) {
    if (part === "" || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return out.join("/");
}

function dirname(p: string): string {
  const i = p.lastIndexOf("/");
  return i === -1 ? "" : p.slice(0, i);
}

/** True for specifiers that point at a project file by relative path. */
export function isRelative(spec: string): boolean {
  return spec.startsWith("./") || spec.startsWith("../") || spec.startsWith("/");
}

function tryExtensions(base: string, fileSet: Set<string>): string | null {
  for (const ext of CODE_EXTS) {
    const candidate = normalizePath(base + ext);
    if (fileSet.has(candidate)) return candidate;
  }
  return null;
}

/**
 * Resolve `spec` imported from `fromPath` against known project files. Tries
 * relative resolution, `@/` and `~/` aliases, and bare baseUrl imports. Returns
 * the matched project path, or null when it points outside the project (npm).
 */
export function resolveSpecifier(
  spec: string,
  fromPath: string,
  fileSet: Set<string>,
): string | null {
  // 1. Relative imports.
  if (isRelative(spec)) {
    const base = spec.startsWith("/")
      ? normalizePath(spec.slice(1))
      : normalizePath(`${dirname(fromPath)}/${spec}`);
    return tryExtensions(base, fileSet);
  }

  // 2. Explicit aliases `@/…` and `~/…` (strip the alias sigil).
  let rest: string | null = null;
  if (spec.startsWith("@/")) rest = spec.slice(2);
  else if (spec.startsWith("~/")) rest = spec.slice(2);
  else if (spec.startsWith("~")) rest = spec.slice(1);

  if (rest !== null) {
    for (const prefix of BASE_PREFIXES) {
      const hit = tryExtensions(prefix + rest, fileSet);
      if (hit) return hit;
    }
    return null;
  }

  // 3. Bare specifier — could be a baseUrl alias (e.g. "components/Button") or
  //    an npm package. Only treat as internal if it matches a project file.
  //    Skip scoped packages ("@scope/pkg") — those are always external.
  if (!spec.startsWith("@")) {
    for (const prefix of BASE_PREFIXES) {
      const hit = tryExtensions(prefix + spec, fileSet);
      if (hit) return hit;
    }
  }

  return null;
}
