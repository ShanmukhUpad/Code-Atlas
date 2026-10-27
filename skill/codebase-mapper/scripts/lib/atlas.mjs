// Generated from src/lib by npm run build:skill. Do not edit.

// src/lib/parse/imports.ts
var IMPORT_RE = /import\s+(?:[\w*{}\n\s,]+?\s+from\s+)?["']([^"']+)["']/g;
var REQUIRE_RE = /require\(\s*["']([^"']+)["']\s*\)/g;
var DYNAMIC_IMPORT_RE = /import\(\s*["']([^"']+)["']\s*\)/g;
var EXPORT_FROM_RE = /export\s+(?:[\w*{}\n\s,]+?)\s+from\s+["']([^"']+)["']/g;
var NAMED_EXPORT_RE = /export\s+(?:async\s+)?(?:default\s+)?(?:const|let|var|function|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/g;
var EXPORT_LIST_RE = /export\s*\{([^}]+)\}/g;
var DEFAULT_EXPORT_RE = /export\s+default\b/;
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}
function extractImports(content) {
  const src = stripComments(content);
  const specs = /* @__PURE__ */ new Set();
  for (const re of [IMPORT_RE, REQUIRE_RE, DYNAMIC_IMPORT_RE, EXPORT_FROM_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src)) !== null) specs.add(m[1]);
  }
  return [...specs];
}
function extractExports(content) {
  const src = stripComments(content);
  const names = /* @__PURE__ */ new Set();
  let m;
  NAMED_EXPORT_RE.lastIndex = 0;
  while ((m = NAMED_EXPORT_RE.exec(src)) !== null) names.add(m[1]);
  EXPORT_LIST_RE.lastIndex = 0;
  while ((m = EXPORT_LIST_RE.exec(src)) !== null) {
    for (const part of m[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name && name !== "default") names.add(name);
    }
  }
  if (DEFAULT_EXPORT_RE.test(src)) names.add("default");
  return [...names];
}
function hasJsx(content) {
  const src = stripComments(content);
  const hasTag = /<([A-Z][\w.]*|[a-z]+)(\s[^>]*)?\/?>/.test(src);
  const jsxContext = /(return|=>)\s*\(?\s*</.test(src);
  return hasTag && jsxContext;
}
function extractHeader(content) {
  const trimmed = content.replace(/^﻿/, "").trimStart();
  let m = /^\/\*\*?([\s\S]*?)\*\//.exec(trimmed);
  if (m) {
    const text = m[1].split("\n").map((l) => l.replace(/^\s*\*?\s?/, "").trim()).filter(Boolean).join(" ").trim();
    return text || void 0;
  }
  m = /^((?:\/\/[^\n]*\n?)+)/.exec(trimmed);
  if (m) {
    const text = m[1].split("\n").map((l) => l.replace(/^\s*\/\/\s?/, "").trim()).filter(Boolean).join(" ").trim();
    return text || void 0;
  }
  return void 0;
}

// src/lib/parse/resolve.ts
var CODE_EXTS = [
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
  "/index.jsx"
];
var BASE_PREFIXES = ["", "src/", "app/", "src/app/", "lib/", "src/lib/"];
function normalizePath(p) {
  const parts = p.split("/");
  const out = [];
  for (const part of parts) {
    if (part === "" || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return out.join("/");
}
function dirname(p) {
  const i = p.lastIndexOf("/");
  return i === -1 ? "" : p.slice(0, i);
}
function isRelative(spec) {
  return spec.startsWith("./") || spec.startsWith("../") || spec.startsWith("/");
}
function tryExtensions(base, fileSet) {
  for (const ext of CODE_EXTS) {
    const candidate = normalizePath(base + ext);
    if (fileSet.has(candidate)) return candidate;
  }
  return null;
}
function resolveSpecifier(spec, fromPath, fileSet) {
  if (isRelative(spec)) {
    const base = spec.startsWith("/") ? normalizePath(spec.slice(1)) : normalizePath(`${dirname(fromPath)}/${spec}`);
    return tryExtensions(base, fileSet);
  }
  let rest = null;
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
  if (!spec.startsWith("@")) {
    for (const prefix of BASE_PREFIXES) {
      const hit = tryExtensions(prefix + spec, fileSet);
      if (hit) return hit;
    }
  }
  return null;
}

// src/lib/parse/python.ts
var PY_PREFIXES = ["", "src/", "app/", "lib/", "backend/"];
function dirname2(p) {
  const i = p.lastIndexOf("/");
  return i === -1 ? "" : p.slice(0, i);
}
function extractPyImports(content) {
  const out = [];
  const fromRe = /^[ \t]*from[ \t]+(\.*)([A-Za-z0-9_.]*)[ \t]+import[ \t]+(\([\s\S]*?\)|[^\n#]+)/gm;
  let m;
  while ((m = fromRe.exec(content)) !== null) {
    const level = m[1].length;
    const moduleName = m[2] || "";
    const names = m[3].replace(/[()]/g, " ").split(",").map((s) => s.trim().split(/\s+as\s+/)[0].trim()).filter((n) => n && n !== "*");
    out.push({ module: moduleName, names, level });
  }
  const importRe = /^[ \t]*import[ \t]+([^\n#]+)/gm;
  while ((m = importRe.exec(content)) !== null) {
    for (const part of m[1].split(",")) {
      const mod = part.trim().split(/\s+as\s+/)[0].trim();
      if (mod) out.push({ module: mod, names: [], level: 0 });
    }
  }
  return out;
}
function extractPyExports(content) {
  const names = /* @__PURE__ */ new Set();
  const defRe = /^(?:async[ \t]+)?(?:def|class)[ \t]+([A-Za-z_]\w*)/gm;
  let m;
  while ((m = defRe.exec(content)) !== null) names.add(m[1]);
  const all = /__all__\s*=\s*[[(]([\s\S]*?)[\])]/.exec(content);
  if (all) {
    for (const s of all[1].match(/["']([^"']+)["']/g) ?? [])
      names.add(s.replace(/["']/g, ""));
  }
  return [...names];
}
function extractPyHeader(content) {
  const t = content.replace(/^#![^\n]*\n/, "").replace(/^﻿/, "").trimStart();
  const m = /^(?:'''([\s\S]*?)'''|"""([\s\S]*?)""")/.exec(t);
  if (!m) return void 0;
  const text = (m[1] ?? m[2] ?? "").replace(/\s+/g, " ").trim();
  return text || void 0;
}
function hasPyMain(content) {
  return /if\s+__name__\s*==\s*["']__main__["']/.test(content);
}
function resolvePyImport(imp, fromPath, fileSet) {
  const deps = /* @__PURE__ */ new Set();
  const tryMod = (base) => {
    for (const suffix of [".py", "/__init__.py"]) {
      const cand = normalizePath(base + suffix);
      if (fileSet.has(cand)) deps.add(cand);
    }
  };
  if (imp.level > 0) {
    let dir = dirname2(fromPath);
    for (let i = 1; i < imp.level; i++) dir = dirname2(dir);
    const base = imp.module ? `${dir}/${imp.module.replace(/\./g, "/")}` : dir;
    tryMod(base);
    for (const n of imp.names) tryMod(`${base}/${n}`);
    return { deps: [...deps], external: null };
  }
  const modPath = imp.module.replace(/\./g, "/");
  const before = deps.size;
  for (const pre of PY_PREFIXES) {
    tryMod(pre + modPath);
    for (const n of imp.names) tryMod(`${pre}${modPath}/${n}`);
  }
  const external = deps.size === before ? imp.module.split(".")[0] : null;
  return { deps: [...deps], external };
}

// src/lib/parse/systemverilog.ts
var NON_MODULE = /* @__PURE__ */ new Set([
  "if",
  "else",
  "for",
  "foreach",
  "while",
  "do",
  "repeat",
  "forever",
  "return",
  "case",
  "casez",
  "casex",
  "endcase",
  "begin",
  "end",
  "generate",
  "endgenerate",
  "always",
  "always_ff",
  "always_comb",
  "always_latch",
  "initial",
  "final",
  "assign",
  "fork",
  "join",
  "wait",
  "disable",
  "posedge",
  "negedge",
  "edge",
  "assert",
  "assume",
  "cover",
  "property",
  "sequence",
  "function",
  "task",
  "module",
  "endmodule",
  "interface",
  "endinterface",
  "package",
  "endpackage",
  "program",
  "class",
  "endclass",
  "typedef",
  "enum",
  "struct",
  "union",
  "import",
  "export",
  "extern",
  "virtual",
  "static",
  "automatic",
  "const",
  "localparam",
  "parameter",
  "genvar",
  "modport",
  "clocking",
  "randcase",
  "with",
  "new",
  "super",
  // data types
  "logic",
  "wire",
  "reg",
  "bit",
  "byte",
  "int",
  "integer",
  "longint",
  "shortint",
  "real",
  "shortreal",
  "time",
  "string",
  "void",
  "chandle",
  "event",
  "signed",
  "unsigned",
  "tri",
  "wand",
  "wor",
  "supply0",
  "supply1",
  "input",
  "output",
  "inout",
  "ref",
  "var",
  "type"
]);
var KW = "module|macromodule|interface|program|primitive|package|checker";
var DEFINE_RE = new RegExp(
  `^[ \\t]*(virtual[ \\t]+)?(${KW})[ \\t]+(?:automatic[ \\t]+|static[ \\t]+)?([A-Za-z_]\\w*)`,
  "gm"
);
var CLASS_RE = /^[ \t]*(?:virtual[ \t]+)?class[ \t]+([A-Za-z_]\w*)/gm;
var INCLUDE_RE = /`include\s+"([^"]+)"/g;
var IMPORT_RE2 = /\bimport\s+([A-Za-z_]\w*)\s*::/g;
var SCOPE_RE = /\b([A-Za-z_]\w*)\s*::/g;
var EXTENDS_RE = /\bclass\s+[A-Za-z_]\w*(?:\s*#\s*\([^;]*?\))?\s+extends\s+([A-Za-z_]\w*)/g;
var INSTANCE_RE = /\b([A-Za-z_]\w*)\s*(?:#\s*\([^;]*?\)\s*)?([A-Za-z_]\w*)\s*(?:\[[^\]]*\]\s*)?\(/g;
function stripComments2(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}
function extractSvComponents(content) {
  const src = stripComments2(content);
  const defines = /* @__PURE__ */ new Set();
  const packages = /* @__PURE__ */ new Set();
  const imports = /* @__PURE__ */ new Set();
  const includes = /* @__PURE__ */ new Set();
  const refs = /* @__PURE__ */ new Set();
  let m;
  DEFINE_RE.lastIndex = 0;
  while ((m = DEFINE_RE.exec(src)) !== null) {
    const isVirtual = !!m[1];
    const kw = m[2];
    const name = m[3];
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
  IMPORT_RE2.lastIndex = 0;
  while ((m = IMPORT_RE2.exec(src)) !== null) imports.add(m[1]);
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
    refs: [...refs]
  };
}
function resolveSvInclude(spec, fromPath, fileSet) {
  const dir = fromPath.includes("/") ? fromPath.slice(0, fromPath.lastIndexOf("/")) : "";
  const rel = normalizePath(`${dir}/${spec}`);
  if (fileSet.has(rel)) return rel;
  if (fileSet.has(spec)) return spec;
  const base = spec.slice(spec.lastIndexOf("/") + 1);
  for (const p of fileSet) {
    if (p.slice(p.lastIndexOf("/") + 1) === base) return p;
  }
  return null;
}

// src/lib/parse/clike.ts
var INCLUDE_RE2 = /^[ \t]*#\s*include\s*(?:"([^"]+)"|<([^>]+)>)/gm;
var TYPE_RE = /\b(?:class|struct|union|enum(?:\s+class)?|namespace)\s+([A-Za-z_]\w*)/g;
var FUNC_RE = /^[A-Za-z_][\w\s\*&:<>,~]*?\b([A-Za-z_]\w*)\s*\([^;{)]*\)\s*(?:const\s*)?(?:noexcept\s*)?\{/gm;
var FUNC_SKIP = /* @__PURE__ */ new Set([
  "if",
  "for",
  "while",
  "switch",
  "return",
  "sizeof",
  "catch",
  "do",
  "else"
]);
function stripComments3(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}
function extractCComponents(content) {
  const src = stripComments3(content);
  const includes = [];
  const exports = /* @__PURE__ */ new Set();
  let m;
  INCLUDE_RE2.lastIndex = 0;
  while ((m = INCLUDE_RE2.exec(src)) !== null) {
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
function resolveCInclude(spec, fromPath, fileSet) {
  const dir = fromPath.includes("/") ? fromPath.slice(0, fromPath.lastIndexOf("/")) : "";
  const rel = normalizePath(`${dir}/${spec}`);
  if (fileSet.has(rel)) return rel;
  if (fileSet.has(spec)) return spec;
  const base = spec.slice(spec.lastIndexOf("/") + 1);
  for (const p of fileSet) {
    if (p.slice(p.lastIndexOf("/") + 1) === base) return p;
  }
  return null;
}

// src/lib/parse/java.ts
var PACKAGE_RE = /^[ \t]*package\s+([\w.]+)\s*;/m;
var IMPORT_RE3 = /^[ \t]*import\s+(?:static\s+)?([\w.]+(?:\.\*)?)\s*;/gm;
var TYPE_RE2 = /\b(?:public\s+|protected\s+|private\s+)?(?:final\s+|abstract\s+|sealed\s+|static\s+)*(?:class|interface|enum|record)\s+([A-Za-z_]\w*)/g;
var MAIN_RE = /\bstatic\s+void\s+main\s*\(/;
function stripComments4(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}
function extractJavaComponents(content) {
  const src = stripComments4(content);
  const pkg = PACKAGE_RE.exec(src)?.[1] ?? "";
  const imports = /* @__PURE__ */ new Set();
  const exports = /* @__PURE__ */ new Set();
  let m;
  IMPORT_RE3.lastIndex = 0;
  while ((m = IMPORT_RE3.exec(src)) !== null) imports.add(m[1]);
  TYPE_RE2.lastIndex = 0;
  while ((m = TYPE_RE2.exec(src)) !== null) exports.add(m[1]);
  return {
    pkg,
    imports: [...imports],
    exports: [...exports],
    hasMain: MAIN_RE.test(src)
  };
}
function resolveJavaImport(name, fileSet) {
  const deps = [];
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

// src/lib/parse/data.ts
function parseJsonInfo(content) {
  try {
    const data = JSON.parse(content);
    if (data && typeof data === "object" && !Array.isArray(data)) {
      const keys = Object.keys(data);
      const shown = keys.slice(0, 8).join(", ");
      return {
        keys: keys.slice(0, 24),
        header: keys.length ? `JSON object with ${keys.length} top-level key${keys.length === 1 ? "" : "s"}: ${shown}${keys.length > 8 ? "\u2026" : ""}.` : "Empty JSON object."
      };
    }
    if (Array.isArray(data)) {
      return { keys: [], header: `JSON array of ${data.length} item${data.length === 1 ? "" : "s"}.` };
    }
    return { keys: [], header: "JSON value." };
  } catch {
    return { keys: [], header: void 0 };
  }
}
function cellText(cell) {
  const s = cell.source;
  return Array.isArray(s) ? s.join("") : typeof s === "string" ? s : "";
}
function parseNotebook(content) {
  try {
    const nb = JSON.parse(content);
    const cells = Array.isArray(nb.cells) ? nb.cells : [];
    const codeParts = [];
    let header;
    for (const cell of cells) {
      if (cell.cell_type === "code") codeParts.push(cellText(cell));
      else if (cell.cell_type === "markdown" && !header) {
        const md = cellText(cell).replace(/[#*`>_-]/g, " ").replace(/\s+/g, " ").trim();
        if (md) header = md.slice(0, 200);
      }
    }
    const code = codeParts.join("\n");
    return { code, codeLoc: code ? code.split("\n").length : 0, header };
  } catch {
    return { code: "", codeLoc: 0, header: void 0 };
  }
}

// src/lib/parse/csharp.ts
var NAMESPACE_RE = /\bnamespace\s+([\w.]+)/g;
var USING_RE = /^[ \t]*(?:global\s+)?using\s+(?:static\s+)?([\w.]+)\s*;/gm;
var TYPE_RE3 = /\b(?:public|internal|private|protected|sealed|abstract|static|partial)\s+(?:[\w]+\s+)*?(?:class|struct|interface|enum|record)\s+([A-Za-z_]\w*)/g;
var TYPE_BARE_RE = /\b(?:class|struct|interface|enum|record)\s+([A-Za-z_]\w*)/g;
var REF_RE = /\b([A-Z][A-Za-z0-9_]*)\b/g;
function stripComments5(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1").replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/@"[^"]*"/g, '""');
}
function extractCsComponents(content) {
  const src = stripComments5(content);
  const defines = /* @__PURE__ */ new Set();
  const namespaces = /* @__PURE__ */ new Set();
  const usings = /* @__PURE__ */ new Set();
  const refs = /* @__PURE__ */ new Set();
  let m;
  NAMESPACE_RE.lastIndex = 0;
  while ((m = NAMESPACE_RE.exec(src)) !== null) namespaces.add(m[1]);
  USING_RE.lastIndex = 0;
  while ((m = USING_RE.exec(src)) !== null) usings.add(m[1]);
  TYPE_RE3.lastIndex = 0;
  while ((m = TYPE_RE3.exec(src)) !== null) defines.add(m[1]);
  TYPE_BARE_RE.lastIndex = 0;
  while ((m = TYPE_BARE_RE.exec(src)) !== null) defines.add(m[1]);
  REF_RE.lastIndex = 0;
  while ((m = REF_RE.exec(src)) !== null) refs.add(m[1]);
  return {
    defines: [...defines],
    namespaces: [...namespaces],
    usings: [...usings],
    refs: [...refs]
  };
}

// src/lib/parse/markup.ts
function isExternalRef(spec) {
  return /^(?:[a-z]+:)?\/\//i.test(spec) || // http://, https://, //cdn…
  /^(?:mailto:|tel:|data:|javascript:|#)/i.test(spec) || spec.trim() === "";
}
function extractHtmlRefs(content) {
  const refs = /* @__PURE__ */ new Set();
  const attrRe = /\b(?:src|href)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = attrRe.exec(content)) !== null) {
    const spec = m[1].split(/[?#]/)[0];
    if (!isExternalRef(spec)) refs.add(spec);
  }
  return [...refs];
}
function resolveHtmlRef(spec, fromPath, fileSet) {
  const dir = fromPath.includes("/") ? fromPath.slice(0, fromPath.lastIndexOf("/")) : "";
  const base = spec.startsWith("/") ? normalizePath(spec.slice(1)) : normalizePath(`${dir}/${spec}`);
  for (const cand of [base, `${base}/index.html`, `${base}.html`]) {
    if (fileSet.has(cand)) return cand;
  }
  return null;
}
function extractCmake(content) {
  const src = content.replace(/#[^\n]*/g, "");
  const subdirs = /* @__PURE__ */ new Set();
  const includes = /* @__PURE__ */ new Set();
  const targets = /* @__PURE__ */ new Set();
  let m;
  const subRe = /\badd_subdirectory\s*\(\s*([^\s)]+)/gi;
  while ((m = subRe.exec(src)) !== null) subdirs.add(m[1].replace(/["']/g, ""));
  const incRe = /\binclude\s*\(\s*([^\s)]+)/gi;
  while ((m = incRe.exec(src)) !== null) includes.add(m[1].replace(/["']/g, ""));
  const tgtRe = /\badd_(?:executable|library)\s*\(\s*([A-Za-z0-9_]+)/gi;
  while ((m = tgtRe.exec(src)) !== null) targets.add(m[1]);
  return { subdirs: [...subdirs], includes: [...includes], targets: [...targets] };
}
function resolveCmakeRef(spec, fromPath, fileSet) {
  const dir = fromPath.includes("/") ? fromPath.slice(0, fromPath.lastIndexOf("/")) : "";
  const rel = spec.startsWith("/") ? normalizePath(spec.slice(1)) : `${dir}/${spec}`;
  const cands = [
    `${rel}/CMakeLists.txt`,
    rel,
    `${rel}.cmake`,
    spec,
    `${spec}.cmake`
  ].map((c) => normalizePath(c));
  for (const c of cands) if (fileSet.has(c)) return c;
  return null;
}

// src/lib/parse/go.ts
var BLOCK_RE = /\bimport\s*\(([\s\S]*?)\)/g;
var PATH_RE = /(?:[\w.]+\s+)?"([^"]+)"/g;
var SINGLE_RE = /^[ \t]*import\s+(?:[\w.]+\s+)?"([^"]+)"/gm;
var FUNC_RE2 = /^func\s+(?:\([^)]*\)\s*)?([A-Z]\w*)/gm;
var TYPE_RE4 = /^type\s+([A-Z]\w*)/gm;
var DECL_RE = /^(?:const|var)\s+([A-Z]\w*)/gm;
function stripComments6(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}
function extractGoComponents(content) {
  const src = stripComments6(content);
  const imports = /* @__PURE__ */ new Set();
  const exports = /* @__PURE__ */ new Set();
  let m;
  BLOCK_RE.lastIndex = 0;
  while ((m = BLOCK_RE.exec(src)) !== null) {
    const body = m[1];
    PATH_RE.lastIndex = 0;
    let p;
    while ((p = PATH_RE.exec(body)) !== null) imports.add(p[1]);
  }
  SINGLE_RE.lastIndex = 0;
  while ((m = SINGLE_RE.exec(src)) !== null) imports.add(m[1]);
  for (const re of [FUNC_RE2, TYPE_RE4, DECL_RE]) {
    re.lastIndex = 0;
    while ((m = re.exec(src)) !== null) exports.add(m[1]);
  }
  const hasMain = /\bpackage\s+main\b/.test(src) && /\bfunc\s+main\s*\(/.test(src);
  return { imports: [...imports], exports: [...exports], hasMain };
}
function resolveGoImport(path, goDirs) {
  for (const [dir, files] of goDirs) {
    if (dir && (path === dir || path.endsWith("/" + dir))) {
      return { deps: files, external: null };
    }
  }
  return { deps: [], external: path };
}

// src/lib/parse/index.ts
var CODE_EXT_RE = /\.(tsx?|jsx?|mjs|cjs|py|sv|svh|v|vh|c|cc|cpp|cxx|c\+\+|cu|cuh|h|hh|hpp|hxx|h\+\+|java|json|ipynb|cs|html?|shader|hlsl|cginc|compute|cmake|go)$/i;
var SV_EXT_RE = /\.(sv|svh|v|vh)$/i;
var C_EXT_RE = /\.(c|cc|cpp|cxx|c\+\+|cu|cuh|h|hh|hpp|hxx|h\+\+)$/i;
var SHADER_EXT_RE = /\.(shader|hlsl|cginc|compute)$/i;
var CMAKE_RE = /(^|\/)CMakeLists\.txt$|\.cmake$/i;
var IGNORE_DIR_RE = /(^|\/)(node_modules|\.git|\.next|dist|build|out|coverage|\.turbo|\.vercel)(\/|$)/;
var IGNORE_FILE_RE = /(^|\/)(package-lock|npm-shrinkwrap)\.json$/i;
function isCodeFile(path) {
  return (CODE_EXT_RE.test(path) || CMAKE_RE.test(path)) && !IGNORE_DIR_RE.test(path) && !IGNORE_FILE_RE.test(path) && !/\.d\.ts$/i.test(path);
}
function baseName(p) {
  return p.slice(p.lastIndexOf("/") + 1);
}
function dirName(p) {
  const i = p.lastIndexOf("/");
  return i === -1 ? "" : p.slice(0, i);
}
function extName(p) {
  const b = baseName(p);
  const i = b.lastIndexOf(".");
  return i === -1 ? "" : b.slice(i);
}
var CONFIG_RE = /(^|\/)(next|tailwind|postcss|vite|vitest|jest|rollup|webpack|babel|eslint|prettier|tsup|drizzle)\.config\.|(^|\/)\.?[\w-]*rc(\.[jt]s)?$|(^|\/)middleware\.[jt]s$/i;
var ENTRY_NAME_RE = /^(page|layout|route|index|main|app|server|_app|_document|middleware)\.[jt]sx?$/i;
var PY_ENTRY_RE = /^(main|manage|app|wsgi|asgi|__main__|run)\.py$/i;
var PY_CONFIG_RE = /^(setup|settings|config|conf|conftest|urls)\.py$/i;
function parseFile(file) {
  const { path, content } = file;
  const ext = extName(path);
  const common = {
    path,
    name: baseName(path),
    dir: dirName(path),
    ext,
    dependencies: [],
    externalImports: [],
    loc: content.split("\n").length
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
      header: extractPyHeader(content)
    };
  }
  if (SV_EXT_RE.test(ext)) {
    const sv = extractSvComponents(content);
    return {
      ...common,
      lang: "sv",
      imports: [],
      svImports: sv.imports,
      svIncludes: sv.includes,
      svRefs: sv.refs,
      svPackages: sv.packages,
      exports: sv.defines,
      hasJsx: false,
      header: extractHeader(content)
    };
  }
  if (ext === ".ipynb") {
    const nb = parseNotebook(content);
    return {
      ...common,
      lang: "ipynb",
      loc: nb.codeLoc,
      imports: [],
      pyImports: extractPyImports(nb.code),
      exports: extractPyExports(nb.code),
      hasJsx: false,
      header: nb.header ?? extractPyHeader(nb.code)
    };
  }
  if (ext === ".json") {
    const j = parseJsonInfo(content);
    return {
      ...common,
      lang: "json",
      imports: [],
      exports: j.keys,
      hasJsx: false,
      header: j.header
    };
  }
  if (C_EXT_RE.test(ext)) {
    const c = extractCComponents(content);
    return {
      ...common,
      lang: "c",
      imports: [],
      cIncludes: c.includes,
      exports: c.exports,
      hasJsx: false,
      hasMain: c.hasMain,
      header: extractHeader(content)
    };
  }
  if (ext === ".java") {
    const j = extractJavaComponents(content);
    return {
      ...common,
      lang: "java",
      imports: [],
      javaImports: j.imports,
      javaPackage: j.pkg,
      exports: j.exports,
      hasJsx: false,
      hasMain: j.hasMain,
      header: extractHeader(content)
    };
  }
  if (ext === ".cs") {
    const cs = extractCsComponents(content);
    return {
      ...common,
      lang: "cs",
      imports: cs.usings,
      csRefs: cs.refs,
      csNamespaces: cs.namespaces,
      exports: cs.defines,
      hasJsx: false,
      hasMain: /\bstatic\s+[\w<>,\[\]\s]*\bMain\s*\(/.test(content),
      header: extractHeader(content)
    };
  }
  if (ext === ".html" || ext === ".htm") {
    return {
      ...common,
      lang: "html",
      imports: extractHtmlRefs(content),
      exports: [],
      hasJsx: false,
      header: /<title[^>]*>([^<]+)<\/title>/i.exec(content)?.[1]?.trim()
    };
  }
  if (SHADER_EXT_RE.test(ext)) {
    const c = extractCComponents(content);
    const names = [...c.exports];
    const shaderName = /\bShader\s+"([^"]+)"/.exec(content)?.[1];
    if (shaderName) names.unshift(shaderName);
    return {
      ...common,
      lang: "shader",
      imports: [],
      cIncludes: c.includes,
      exports: names,
      hasJsx: false,
      header: extractHeader(content)
    };
  }
  if (CMAKE_RE.test(path)) {
    const cm = extractCmake(content);
    return {
      ...common,
      lang: "cmake",
      imports: [...cm.subdirs, ...cm.includes],
      exports: cm.targets,
      hasJsx: false,
      header: void 0
    };
  }
  if (ext === ".go") {
    const g = extractGoComponents(content);
    return {
      ...common,
      lang: "go",
      imports: g.imports,
      exports: g.exports,
      hasJsx: false,
      hasMain: g.hasMain,
      header: extractHeader(content)
    };
  }
  return {
    ...common,
    lang: "js",
    imports: extractImports(content),
    exports: extractExports(content),
    hasJsx: hasJsx(content),
    header: extractHeader(content)
  };
}
function classifyRole(f, fanIn, fanOut) {
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
  if (f.lang === "sv") {
    const isPkg = (f.svPackages?.length ?? 0) > 0;
    const isHeader = /\.(svh|vh)$/i.test(f.ext);
    if (isPkg || isHeader) return "config";
    if (/(^|[._-])(tb|top|testbench|test)([._-]|$)/i.test(f.name)) return "entry";
    if (fanIn === 0 && fanOut > 0) return "entry";
    if (fanIn >= 4 && fanIn >= fanOut) return "hub";
    if (fanOut >= 5) return "orchestrator";
    if (fanIn === 0 && fanOut === 0) return "file";
    return "util";
  }
  if (f.lang === "json" || f.lang === "cmake") return "config";
  if (f.lang === "cs") {
    if (f.hasMain) return "entry";
    if (/Test\b/i.test(f.name) || /(^|\/)tests?\//i.test(f.path)) return "util";
    if (fanIn >= 4 && fanIn >= fanOut) return "hub";
    if (fanOut >= 6) return "orchestrator";
    if (fanIn === 0 && fanOut === 0) return "file";
    return "util";
  }
  if (f.lang === "html") {
    if (/(^|\/)index\.html?$/i.test(f.path) || fanOut > 0) return "entry";
    return "file";
  }
  if (f.lang === "shader") {
    const isInclude = /\.(cginc|hlsl)$/i.test(f.ext);
    if (isInclude && fanIn >= 3) return "hub";
    if (isInclude) return "config";
    if (fanOut >= 3) return "orchestrator";
    if (fanIn === 0 && fanOut === 0) return "file";
    return "component";
  }
  if (f.lang === "ipynb") {
    return fanOut > 0 ? "entry" : "file";
  }
  if (f.lang === "c") {
    if (f.hasMain) return "entry";
    if (fanIn >= 4 && fanIn >= fanOut) return "hub";
    if (fanOut >= 5) return "orchestrator";
    if (fanIn === 0 && fanOut === 0) return "file";
    return "util";
  }
  if (f.lang === "go") {
    if (f.hasMain) return "entry";
    if (/_test\.go$/i.test(f.name)) return "util";
    if (fanIn >= 4 && fanIn >= fanOut) return "hub";
    if (fanOut >= 6) return "orchestrator";
    if (fanIn === 0 && fanOut === 0) return "file";
    return "util";
  }
  if (f.lang === "java") {
    if (f.hasMain) return "entry";
    if (/Tests?\.java$/i.test(f.name) || /(^|\/)tests?\//i.test(f.path))
      return "util";
    if (fanIn >= 4 && fanIn >= fanOut) return "hub";
    if (fanOut >= 5) return "orchestrator";
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
function parseProject(rawFiles) {
  const codeFiles = rawFiles.filter((f) => isCodeFile(f.path));
  const parsed = codeFiles.map(parseFile);
  const fileSet = new Set(parsed.map((p) => p.path));
  const svRegistry = /* @__PURE__ */ new Map();
  for (const p of parsed) {
    if (p.lang !== "sv") continue;
    for (const name of p.exports) if (!svRegistry.has(name)) svRegistry.set(name, p.path);
  }
  const cFileSet = new Set(parsed.filter((p) => p.lang === "c").map((p) => p.path));
  const javaFileSet = new Set(parsed.filter((p) => p.lang === "java").map((p) => p.path));
  const shaderFileSet = new Set(
    parsed.filter((p) => p.lang === "shader").map((p) => p.path)
  );
  const goDirs = /* @__PURE__ */ new Map();
  for (const p of parsed) {
    if (p.lang !== "go") continue;
    const list = goDirs.get(p.dir) ?? [];
    list.push(p.path);
    goDirs.set(p.dir, list);
  }
  const csRegistry = /* @__PURE__ */ new Map();
  const csNamespaces = /* @__PURE__ */ new Set();
  for (const p of parsed) {
    if (p.lang !== "cs") continue;
    for (const name of p.exports) if (!csRegistry.has(name)) csRegistry.set(name, p.path);
    for (const ns of p.csNamespaces ?? []) csNamespaces.add(ns);
  }
  const dependents = /* @__PURE__ */ new Map();
  for (const p of parsed) {
    const deps = /* @__PURE__ */ new Set();
    const external = [];
    if (p.lang === "py" || p.lang === "ipynb") {
      for (const imp of p.pyImports ?? []) {
        const { deps: d, external: ext } = resolvePyImport(imp, p.path, fileSet);
        for (const x of d) if (x !== p.path) deps.add(x);
        if (ext) external.push(ext);
      }
    } else if (p.lang === "c") {
      for (const inc of p.cIncludes ?? []) {
        if (inc.system) {
          external.push(inc.spec);
          continue;
        }
        const target = resolveCInclude(inc.spec, p.path, cFileSet);
        if (target && target !== p.path) deps.add(target);
        else external.push(inc.spec);
      }
    } else if (p.lang === "java") {
      for (const name of p.javaImports ?? []) {
        const { deps: d, external: ext } = resolveJavaImport(name, javaFileSet);
        for (const x of d) if (x !== p.path) deps.add(x);
        if (ext) external.push(ext);
      }
    } else if (p.lang === "json") {
    } else if (p.lang === "cs") {
      for (const ref of p.csRefs ?? []) {
        const target = csRegistry.get(ref);
        if (target && target !== p.path) deps.add(target);
      }
      for (const use of p.imports) {
        const internal = csNamespaces.has(use) || [...csNamespaces].some((ns) => ns.startsWith(use + ".") || use.startsWith(ns + "."));
        if (!internal) external.push(use.split(".")[0] || use);
      }
    } else if (p.lang === "html") {
      for (const spec of p.imports) {
        const target = resolveHtmlRef(spec, p.path, fileSet);
        if (target && target !== p.path) deps.add(target);
      }
    } else if (p.lang === "shader") {
      for (const inc of p.cIncludes ?? []) {
        if (inc.system) {
          external.push(inc.spec);
          continue;
        }
        const target = resolveCInclude(inc.spec, p.path, shaderFileSet);
        if (target && target !== p.path) deps.add(target);
        else external.push(inc.spec);
      }
    } else if (p.lang === "cmake") {
      for (const spec of p.imports) {
        const target = resolveCmakeRef(spec, p.path, fileSet);
        if (target && target !== p.path) deps.add(target);
      }
    } else if (p.lang === "go") {
      for (const path of p.imports) {
        const { deps: d, external: ext } = resolveGoImport(path, goDirs);
        for (const x of d) if (x !== p.path) deps.add(x);
        if (ext) external.push(ext);
      }
    } else if (p.lang === "sv") {
      for (const ref of p.svRefs ?? []) {
        const target = svRegistry.get(ref);
        if (target && target !== p.path) deps.add(target);
      }
      for (const pkg of p.svImports ?? []) {
        const target = svRegistry.get(pkg);
        if (target && target !== p.path) deps.add(target);
        else if (!target) external.push(pkg);
      }
      for (const inc of p.svIncludes ?? []) {
        const target = resolveSvInclude(inc, p.path, fileSet);
        if (target && target !== p.path) deps.add(target);
        else if (!target) external.push(inc);
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
  const files = parsed.map((p) => {
    const deps = dependents.get(p.path) ?? [];
    const fanIn = deps.length;
    const fanOut = p.dependencies.length;
    return {
      ...p,
      dependents: deps,
      fanIn,
      fanOut,
      role: classifyRole(p, fanIn, fanOut)
    };
  });
  const byPath = new Map(files.map((f) => [f.path, f]));
  const folders = buildFolders(files);
  return { files, folders, byPath };
}
function buildFolders(files) {
  const map = /* @__PURE__ */ new Map();
  for (const f of files) {
    const segs = f.dir === "" ? [] : f.dir.split("/");
    for (let i = 1; i <= segs.length; i++) {
      const dir = segs.slice(0, i).join("/");
      const list = map.get(dir) ?? [];
      list.push(f);
      map.set(dir, list);
    }
    const root = map.get("") ?? [];
    root.push(f);
    map.set("", root);
  }
  const folders = [];
  for (const [path, group] of map) {
    if (path === "") continue;
    const keyFiles = [...group].sort((a, b) => b.fanIn - a.fanIn).slice(0, 3).map((f) => f.path);
    folders.push({
      path,
      name: baseName(path) || path,
      fileCount: group.length,
      childFiles: group.map((f) => f.path),
      keyFiles
    });
  }
  return folders;
}

// src/lib/explain/heuristic.ts
var ROLE_LABEL = {
  entry: "an entry point",
  hub: "a core module",
  orchestrator: "a coordinator",
  component: "a UI component",
  util: "a helper module",
  config: "a configuration file",
  file: "a standalone file"
};
var SV_ROLE_LABEL = {
  entry: "a top-level module",
  hub: "a widely-instantiated block",
  orchestrator: "a structural/integration module",
  component: "a module",
  util: "a leaf module",
  config: "a shared package/header",
  file: "a standalone module"
};
var ROLE_PLURAL = {
  entry: "entry points",
  hub: "core modules",
  orchestrator: "coordinators",
  component: "UI components",
  util: "helpers",
  config: "config files",
  file: "files"
};
function pretty(paths, max = 3) {
  const names = paths.map((p) => p.slice(p.lastIndexOf("/") + 1));
  if (names.length <= max) return names.join(", ");
  return `${names.slice(0, max).join(", ")} +${names.length - max} more`;
}
function firstSentence(text, limit = 160) {
  const clean = text.replace(/\s+/g, " ").trim();
  const end = clean.search(/[.!?]\s/);
  const s = end === -1 ? clean : clean.slice(0, end + 1);
  return s.length > limit ? s.slice(0, limit - 1).trimEnd() + "\u2026" : s;
}
function explainFile(f) {
  const roleText = (f.lang === "sv" ? SV_ROLE_LABEL : ROLE_LABEL)[f.role];
  const header = f.header ? firstSentence(f.header) : "";
  const sv = f.lang === "sv";
  let summary;
  if (header) {
    summary = header;
  } else if (f.role === "entry") {
    summary = sv ? `Top-level module \u2014 instantiates ${f.fanOut} submodule${f.fanOut === 1 ? "" : "s"}; nothing instantiates it.` : `Entry point \u2014 the app reaches this file directly (${f.exports.length} export${f.exports.length === 1 ? "" : "s"}).`;
  } else if (f.role === "hub") {
    summary = sv ? `Reused block instantiated by ${f.fanIn} module${f.fanIn === 1 ? "" : "s"} \u2014 changes here ripple widely.` : `Core module used by ${f.fanIn} other file${f.fanIn === 1 ? "" : "s"} \u2014 changes here ripple widely.`;
  } else if (f.role === "component") {
    summary = `UI component${f.fanIn ? `, rendered by ${f.fanIn} file${f.fanIn === 1 ? "" : "s"}` : ""}.`;
  } else if (f.role === "orchestrator") {
    summary = `Coordinator that pulls together ${f.fanOut} module${f.fanOut === 1 ? "" : "s"}.`;
  } else if (f.fanIn === 0 && f.fanOut === 0) {
    summary = `Standalone file with no in-project dependencies detected.`;
  } else {
    summary = `Helper used by ${f.fanIn} file${f.fanIn === 1 ? "" : "s"}; depends on ${f.fanOut}.`;
  }
  const parts = [];
  parts.push(
    `\`${f.name}\` is ${roleText} in this project${f.dir ? ` (under \`${f.dir}\`)` : ""}.`
  );
  if (header) parts.push(`Its header notes: \u201C${header}\u201D.`);
  if (f.fanOut > 0)
    parts.push(`It builds on ${f.fanOut} internal module${f.fanOut === 1 ? "" : "s"} (${pretty(f.dependencies)}).`);
  else parts.push(`It relies only on external packages, not other project files.`);
  if (f.fanIn > 0)
    parts.push(`${f.fanIn} file${f.fanIn === 1 ? "" : "s"} depend on it (${pretty(f.dependents)}), so it is ${f.fanIn >= 4 ? "load-bearing" : "shared"}.`);
  else parts.push(`Nothing else imports it \u2014 it is a leaf in the dependency tree.`);
  if (f.exports.length)
    parts.push(`Exposes: ${f.exports.slice(0, 6).join(", ")}${f.exports.length > 6 ? "\u2026" : ""}.`);
  return { path: f.path, summary, role: parts.join(" "), source: "heuristic" };
}
function explainFolder(folder, filesByPath) {
  const files = folder.childFiles.map((p) => filesByPath[p]).filter(Boolean);
  const roleCount = /* @__PURE__ */ new Map();
  for (const f of files) roleCount.set(f.role, (roleCount.get(f.role) ?? 0) + 1);
  const dominant = [...roleCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const isRoot = folder.path === ".";
  const summary = `${isRoot ? "The whole project" : "Folder"} \u2014 ${folder.fileCount} file${folder.fileCount === 1 ? "" : "s"}${dominant ? `, mostly ${ROLE_PLURAL[dominant]}` : ""}.`;
  const parts = [];
  parts.push(
    `\`${folder.name}\` ${isRoot ? "spans" : "groups"} ${folder.fileCount} source file${folder.fileCount === 1 ? "" : "s"}.`
  );
  if (dominant)
    parts.push(`It is mostly ${ROLE_PLURAL[dominant]}.`);
  if (folder.keyFiles.length)
    parts.push(`The most-depended-on files here are ${pretty(folder.keyFiles)}.`);
  const outward = /* @__PURE__ */ new Set();
  for (const f of files) {
    for (const d of f.dependencies) {
      const ddir = d.includes("/") ? d.slice(0, d.lastIndexOf("/")) : "";
      if (ddir !== folder.path && !ddir.startsWith(folder.path + "/"))
        outward.add(ddir || "the project root");
    }
  }
  if (outward.size && !isRoot)
    parts.push(
      `It reaches into other areas: ${[...outward].slice(0, 4).join(", ")}.`
    );
  return {
    path: folder.path,
    summary,
    role: parts.join(" "),
    source: "heuristic"
  };
}
export {
  explainFile,
  explainFolder,
  isCodeFile,
  parseProject
};
