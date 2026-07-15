import type { PyImport } from "@/types";
import { normalizePath } from "./resolve";

// Base prefixes tried when resolving absolute Python modules to files.
const PY_PREFIXES = ["", "src/", "app/", "lib/", "backend/"];

function dirname(p: string): string {
  const i = p.lastIndexOf("/");
  return i === -1 ? "" : p.slice(0, i);
}

/** Extract `import` / `from … import …` statements (handles relative + parens). */
export function extractPyImports(content: string): PyImport[] {
  const out: PyImport[] = [];

  // from [.]* module import (a, b) | a as b, c | *
  const fromRe =
    /^[ \t]*from[ \t]+(\.*)([A-Za-z0-9_.]*)[ \t]+import[ \t]+(\([\s\S]*?\)|[^\n#]+)/gm;
  let m: RegExpExecArray | null;
  while ((m = fromRe.exec(content)) !== null) {
    const level = m[1].length;
    const moduleName = m[2] || "";
    const names = m[3]
      .replace(/[()]/g, " ")
      .split(",")
      .map((s) => s.trim().split(/\s+as\s+/)[0].trim())
      .filter((n) => n && n !== "*");
    out.push({ module: moduleName, names, level });
  }

  // import a, b.c as d
  const importRe = /^[ \t]*import[ \t]+([^\n#]+)/gm;
  while ((m = importRe.exec(content)) !== null) {
    for (const part of m[1].split(",")) {
      const mod = part.trim().split(/\s+as\s+/)[0].trim();
      if (mod) out.push({ module: mod, names: [], level: 0 });
    }
  }
  return out;
}

/** Top-level `def`/`class` names + `__all__`, as this module's "exports". */
export function extractPyExports(content: string): string[] {
  const names = new Set<string>();
  const defRe = /^(?:async[ \t]+)?(?:def|class)[ \t]+([A-Za-z_]\w*)/gm;
  let m: RegExpExecArray | null;
  while ((m = defRe.exec(content)) !== null) names.add(m[1]);

  const all = /__all__\s*=\s*[[(]([\s\S]*?)[\])]/.exec(content);
  if (all) {
    for (const s of all[1].match(/["']([^"']+)["']/g) ?? [])
      names.add(s.replace(/["']/g, ""));
  }
  return [...names];
}

/** Module-level docstring, if present. */
export function extractPyHeader(content: string): string | undefined {
  const t = content.replace(/^#![^\n]*\n/, "").replace(/^﻿/, "").trimStart();
  const m = /^(?:'''([\s\S]*?)'''|"""([\s\S]*?)""")/.exec(t);
  if (!m) return undefined;
  const text = (m[1] ?? m[2] ?? "").replace(/\s+/g, " ").trim();
  return text || undefined;
}

export function hasPyMain(content: string): boolean {
  return /if\s+__name__\s*==\s*["']__main__["']/.test(content);
}

/**
 * Resolve a Python import to project file(s). Handles absolute dotted modules
 * (with common source roots) and relative imports, and reports the external
 * package root when nothing in the project matches.
 */
export function resolvePyImport(
  imp: PyImport,
  fromPath: string,
  fileSet: Set<string>,
): { deps: string[]; external: string | null } {
  const deps = new Set<string>();

  const tryMod = (base: string): void => {
    for (const suffix of [".py", "/__init__.py"]) {
      const cand = normalizePath(base + suffix);
      if (fileSet.has(cand)) deps.add(cand);
    }
  };

  if (imp.level > 0) {
    // Relative: walk up (level-1) dirs from the importing file's directory.
    let dir = dirname(fromPath);
    for (let i = 1; i < imp.level; i++) dir = dirname(dir);
    const base = imp.module ? `${dir}/${imp.module.replace(/\./g, "/")}` : dir;
    tryMod(base);
    for (const n of imp.names) tryMod(`${base}/${n}`);
    return { deps: [...deps], external: null };
  }

  // Absolute: try each source-root prefix; also treat imported names as submodules.
  const modPath = imp.module.replace(/\./g, "/");
  const before = deps.size;
  for (const pre of PY_PREFIXES) {
    tryMod(pre + modPath);
    for (const n of imp.names) tryMod(`${pre}${modPath}/${n}`);
  }
  const external = deps.size === before ? imp.module.split(".")[0] : null;
  return { deps: [...deps], external };
}
