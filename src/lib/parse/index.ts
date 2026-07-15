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
import { extractSvComponents, resolveSvInclude } from "./systemverilog";
import { extractCComponents, resolveCInclude } from "./clike";
import { extractJavaComponents, resolveJavaImport } from "./java";
import { parseJsonInfo, parseNotebook } from "./data";
import { extractCsComponents } from "./csharp";
import {
  extractCmake,
  extractHtmlRefs,
  resolveCmakeRef,
  resolveHtmlRef,
} from "./markup";
import { extractGoComponents, resolveGoImport } from "./go";

export const CODE_EXT_RE =
  /\.(tsx?|jsx?|mjs|cjs|py|sv|svh|v|vh|c|cc|cpp|cxx|c\+\+|cu|cuh|h|hh|hpp|hxx|h\+\+|java|json|ipynb|cs|html?|shader|hlsl|cginc|compute|cmake|go)$/i;
const SV_EXT_RE = /\.(sv|svh|v|vh)$/i;
// CUDA (.cu/.cuh) shares C/C++'s #include model, so it is parsed as C.
const C_EXT_RE = /\.(c|cc|cpp|cxx|c\+\+|cu|cuh|h|hh|hpp|hxx|h\+\+)$/i;
const SHADER_EXT_RE = /\.(shader|hlsl|cginc|compute)$/i;
// CMakeLists.txt has no code extension — match it by basename.
const CMAKE_RE = /(^|\/)CMakeLists\.txt$|\.cmake$/i;
const IGNORE_DIR_RE =
  /(^|\/)(node_modules|\.git|\.next|dist|build|out|coverage|\.turbo|\.vercel)(\/|$)/;
// Machine-generated JSON that would only add giant, meaningless nodes.
const IGNORE_FILE_RE = /(^|\/)(package-lock|npm-shrinkwrap)\.json$/i;

export function isCodeFile(path: string): boolean {
  return (
    (CODE_EXT_RE.test(path) || CMAKE_RE.test(path)) &&
    !IGNORE_DIR_RE.test(path) &&
    !IGNORE_FILE_RE.test(path) &&
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
      header: extractHeader(content),
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
      header: nb.header ?? extractPyHeader(nb.code),
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
      header: j.header,
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
      header: extractHeader(content),
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
      header: extractHeader(content),
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
      header: extractHeader(content),
    };
  }

  if (ext === ".html" || ext === ".htm") {
    return {
      ...common,
      lang: "html",
      imports: extractHtmlRefs(content),
      exports: [],
      hasJsx: false,
      header: /<title[^>]*>([^<]+)<\/title>/i.exec(content)?.[1]?.trim(),
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
      header: extractHeader(content),
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
      header: undefined,
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
      header: extractHeader(content),
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

  if (f.lang === "sv") {
    const isPkg = (f.svPackages?.length ?? 0) > 0;
    const isHeader = /\.(svh|vh)$/i.test(f.ext);
    // Packages (shared params/types) and header files act as shared config.
    if (isPkg || isHeader) return "config";
    if (/(^|[._-])(tb|top|testbench|test)([._-]|$)/i.test(f.name)) return "entry";
    // Top-level: instantiates submodules but nothing instantiates it.
    if (fanIn === 0 && fanOut > 0) return "entry";
    if (fanIn >= 4 && fanIn >= fanOut) return "hub"; // widely-reused block
    if (fanOut >= 5) return "orchestrator"; // structural/integration module
    if (fanIn === 0 && fanOut === 0) return "file";
    return "util"; // leaf module
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
    // .cginc/.hlsl are shared shader includes; .shader/.compute are the programs.
    const isInclude = /\.(cginc|hlsl)$/i.test(f.ext);
    if (isInclude && fanIn >= 3) return "hub";
    if (isInclude) return "config";
    if (fanOut >= 3) return "orchestrator";
    if (fanIn === 0 && fanOut === 0) return "file";
    return "component";
  }

  if (f.lang === "ipynb") {
    // Notebooks are top-level and never imported; entry when they pull in code.
    return fanOut > 0 ? "entry" : "file";
  }

  if (f.lang === "c") {
    if (f.hasMain) return "entry";
    if (fanIn >= 4 && fanIn >= fanOut) return "hub"; // widely-included header
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

  // SystemVerilog deps are name-based: map every declared design-unit name
  // (module/interface/package/class…) to the file that declares it.
  const svRegistry = new Map<string, string>();
  for (const p of parsed) {
    if (p.lang !== "sv") continue;
    for (const name of p.exports) if (!svRegistry.has(name)) svRegistry.set(name, p.path);
  }

  // Include/import resolution for C, Java, and shaders is restricted to same-kind files.
  const cFileSet = new Set(parsed.filter((p) => p.lang === "c").map((p) => p.path));
  const javaFileSet = new Set(parsed.filter((p) => p.lang === "java").map((p) => p.path));
  const shaderFileSet = new Set(
    parsed.filter((p) => p.lang === "shader").map((p) => p.path),
  );

  // Go imports resolve to a package = a directory of .go files.
  const goDirs = new Map<string, string[]>();
  for (const p of parsed) {
    if (p.lang !== "go") continue;
    const list = goDirs.get(p.dir) ?? [];
    list.push(p.path);
    goDirs.set(p.dir, list);
  }

  // C# is name-based like SV: map every declared type name to its file, and
  // collect declared namespaces so internal `using`s aren't flagged as external.
  const csRegistry = new Map<string, string>();
  const csNamespaces = new Set<string>();
  for (const p of parsed) {
    if (p.lang !== "cs") continue;
    for (const name of p.exports) if (!csRegistry.has(name)) csRegistry.set(name, p.path);
    for (const ns of p.csNamespaces ?? []) csNamespaces.add(ns);
  }

  // Resolve dependencies + accumulate dependents.
  const dependents = new Map<string, string[]>();
  for (const p of parsed) {
    const deps = new Set<string>();
    const external: string[] = [];
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
      // Data files have no dependencies.
    } else if (p.lang === "cs") {
      // Type references resolved by name → precise cross-file edges.
      for (const ref of p.csRefs ?? []) {
        const target = csRegistry.get(ref);
        if (target && target !== p.path) deps.add(target);
      }
      // `using`s only label external libraries (UnityEngine, System, …).
      for (const use of p.imports) {
        const internal =
          csNamespaces.has(use) ||
          [...csNamespaces].some((ns) => ns.startsWith(use + ".") || use.startsWith(ns + "."));
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
      // Name-based refs (instantiations, `extends`, `::` scopes) → registry.
      for (const ref of p.svRefs ?? []) {
        const target = svRegistry.get(ref);
        if (target && target !== p.path) deps.add(target);
      }
      // `import pkg::…` → registry; unresolved packages are external libraries.
      for (const pkg of p.svImports ?? []) {
        const target = svRegistry.get(pkg);
        if (target && target !== p.path) deps.add(target);
        else if (!target) external.push(pkg);
      }
      // `include "…"` → path-based against project files.
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
