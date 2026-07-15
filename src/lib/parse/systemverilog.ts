// Lightweight, dependency-free extraction of design units + references from
// SystemVerilog / Verilog source. Not a real elaborator — regex heuristics
// tuned for real-world RTL and UVM code. Hardware dependencies are name-based
// (module/package/class names are global), so resolution is registry-driven
// rather than path-driven; `include is the one path-based case.

import { normalizePath } from "./resolve";

export interface SvComponents {
  /** Design-unit names declared here (modules, interfaces, packages, classes…). */
  defines: string[];
  /** Names of packages declared here (subset of defines, used for role hints). */
  packages: string[];
  /** Package names brought in via `import pkg::…` (for external reporting). */
  imports: string[];
  /** `include "…"` specifiers. */
  includes: string[];
  /** Names referenced as dependencies: instantiations, `extends`, and `::` scopes. */
  refs: string[];
}

// Tokens that can appear where the instantiation regex expects a "type" or an
// "instance" name — filtered out so keywords/datatypes aren't taken as modules.
const NON_MODULE = new Set([
  "if", "else", "for", "foreach", "while", "do", "repeat", "forever", "return",
  "case", "casez", "casex", "endcase", "begin", "end", "generate", "endgenerate",
  "always", "always_ff", "always_comb", "always_latch", "initial", "final",
  "assign", "fork", "join", "wait", "disable", "posedge", "negedge", "edge",
  "assert", "assume", "cover", "property", "sequence", "function", "task",
  "module", "endmodule", "interface", "endinterface", "package", "endpackage",
  "program", "class", "endclass", "typedef", "enum", "struct", "union", "import",
  "export", "extern", "virtual", "static", "automatic", "const", "localparam",
  "parameter", "genvar", "modport", "clocking", "randcase", "with", "new", "super",
  // data types
  "logic", "wire", "reg", "bit", "byte", "int", "integer", "longint", "shortint",
  "real", "shortreal", "time", "string", "void", "chandle", "event", "signed",
  "unsigned", "tri", "wand", "wor", "supply0", "supply1", "input", "output",
  "inout", "ref", "var", "type",
]);

const KW = "module|macromodule|interface|program|primitive|package|checker";
// A design-unit header: optional `virtual` (only meaningful for interface/class),
// the keyword, optional lifetime, then the declared name.
const DEFINE_RE = new RegExp(
  `^[ \\t]*(virtual[ \\t]+)?(${KW})[ \\t]+(?:automatic[ \\t]+|static[ \\t]+)?([A-Za-z_]\\w*)`,
  "gm",
);
const CLASS_RE = /^[ \t]*(?:virtual[ \t]+)?class[ \t]+([A-Za-z_]\w*)/gm;

const INCLUDE_RE = /`include\s+"([^"]+)"/g;
const IMPORT_RE = /\bimport\s+([A-Za-z_]\w*)\s*::/g;
// Scope resolution `pkg_or_class::thing` — the left side is a real dependency.
const SCOPE_RE = /\b([A-Za-z_]\w*)\s*::/g;
// `class Foo [#(...)] extends Bar` — dependency on the base class.
const EXTENDS_RE =
  /\bclass\s+[A-Za-z_]\w*(?:\s*#\s*\([^;]*?\))?\s+extends\s+([A-Za-z_]\w*)/g;
// Instantiation: `Type [#(...)] inst_name [range] (` — two identifiers + a paren.
// The optional param block is bounded to `[^;]` so it can't run across the
// statement terminator and swallow the module body (parameter lists have no `;`).
const INSTANCE_RE =
  /\b([A-Za-z_]\w*)\s*(?:#\s*\([^;]*?\)\s*)?([A-Za-z_]\w*)\s*(?:\[[^\]]*\]\s*)?\(/g;

/** Strip line + block comments so patterns don't match commented-out code. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/** Extract design units + reference names from one SV/Verilog file. */
export function extractSvComponents(content: string): SvComponents {
  const src = stripComments(content);
  const defines = new Set<string>();
  const packages = new Set<string>();
  const imports = new Set<string>();
  const includes = new Set<string>();
  const refs = new Set<string>();
  let m: RegExpExecArray | null;

  DEFINE_RE.lastIndex = 0;
  while ((m = DEFINE_RE.exec(src)) !== null) {
    const isVirtual = !!m[1];
    const kw = m[2];
    const name = m[3];
    // `virtual interface foo vif;` is a handle declaration, not a definition.
    if (isVirtual && kw === "interface") continue;
    if (NON_MODULE.has(name)) continue;
    defines.add(name);
    if (kw === "package") packages.add(name);
  }

  CLASS_RE.lastIndex = 0;
  while ((m = CLASS_RE.exec(src)) !== null) {
    if (!NON_MODULE.has(m[1])) defines.add(m[1]);
  }

  INCLUDE_RE.lastIndex = 0;
  while ((m = INCLUDE_RE.exec(src)) !== null) includes.add(m[1]);

  IMPORT_RE.lastIndex = 0;
  while ((m = IMPORT_RE.exec(src)) !== null) imports.add(m[1]);

  SCOPE_RE.lastIndex = 0;
  while ((m = SCOPE_RE.exec(src)) !== null) refs.add(m[1]);

  EXTENDS_RE.lastIndex = 0;
  while ((m = EXTENDS_RE.exec(src)) !== null) refs.add(m[1]);

  INSTANCE_RE.lastIndex = 0;
  while ((m = INSTANCE_RE.exec(src)) !== null) {
    if (!NON_MODULE.has(m[1]) && !NON_MODULE.has(m[2])) refs.add(m[1]);
  }

  return {
    defines: [...defines],
    packages: [...packages],
    imports: [...imports],
    includes: [...includes],
    refs: [...refs],
  };
}

/**
 * Resolve an `include "…"` specifier to a project file. Tries the path relative
 * to the including file first, then any project file matching by basename (RTL
 * include dirs are configured outside the source, so basenames are common).
 */
export function resolveSvInclude(
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
