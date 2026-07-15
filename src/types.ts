// Shared domain types for Code Atlas.

/** A raw source file pulled from an upload or a GitHub repo. */
export interface RawFile {
  /** POSIX-style path relative to the project root, e.g. "src/lib/parse/imports.ts". */
  path: string;
  content: string;
}

export type NodeRole =
  | "entry"
  | "hub"
  | "orchestrator"
  | "component"
  | "util"
  | "config"
  | "file";

export type Lang = "js" | "py" | "sv" | "c" | "java" | "json" | "ipynb";

/** A parsed Python import statement. */
export interface PyImport {
  /** Dotted module path, e.g. "app.services" ("" for `from . import x`). */
  module: string;
  /** Imported names (for `from … import a, b`). */
  names: string[];
  /** Number of leading dots (0 = absolute, 1 = current package, …). */
  level: number;
}

/** A parsed file with its imports/exports resolved against the project. */
export interface ParsedFile {
  path: string;
  name: string;
  dir: string;
  ext: string;
  lang: Lang;
  /** Raw import specifiers found in the file. */
  imports: string[];
  /** Parsed Python imports (only for `lang === "py"`). */
  pyImports?: PyImport[];
  /** Package names imported via `import pkg::…` (only for `lang === "sv"`). */
  svImports?: string[];
  /** `include "…"` specifiers (only for `lang === "sv"`). */
  svIncludes?: string[];
  /** Referenced design-unit names — instantiations, `extends`, `::` scopes. */
  svRefs?: string[];
  /** Package names declared in this file (subset of exports; role hint). */
  svPackages?: string[];
  /** C/C++ `#include` directives (only for `lang === "c"`). */
  cIncludes?: { spec: string; system: boolean }[];
  /** Java `import` names, possibly wildcard (only for `lang === "java"`). */
  javaImports?: string[];
  /** Declared Java package (only for `lang === "java"`). */
  javaPackage?: string;
  /** External (npm/builtin) specifiers, i.e. not resolved to a project file. */
  externalImports: string[];
  /** Project file paths this file depends on (resolved). */
  dependencies: string[];
  exports: string[];
  hasJsx: boolean;
  /** Python file with a `__main__` guard. */
  hasMain?: boolean;
  loc: number;
  /** Leading block/line comment at the top of the file, if any. */
  header?: string;
}

/** Graph-level metrics + role, computed after resolution. */
export interface FileMeta extends ParsedFile {
  role: NodeRole;
  /** Files that import this one. */
  dependents: string[];
  fanIn: number;
  fanOut: number;
}

/** Data payload carried by a React Flow file node. */
export interface FileNodeData {
  kind: "file";
  path: string;
  label: string;
  role: NodeRole;
  fanIn: number;
  fanOut: number;
  ext: string;
  [key: string]: unknown;
}

/** Data payload carried by a React Flow folder node (expandable). */
export interface FolderNodeData {
  kind: "folder";
  path: string;
  label: string;
  fileCount: number;
  expanded: boolean;
  hasChildren: boolean;
  [key: string]: unknown;
}

export type AtlasNodeData = FileNodeData | FolderNodeData;

/** AI/heuristic explanation for a file or folder, keyed by path. */
export interface Explanation {
  path: string;
  /** One-line summary shown on hover. */
  summary: string;
  /** Longer role-in-the-system paragraph shown in the detail panel. */
  role: string;
  source: "ai" | "heuristic";
}

/** Metadata for a folder used by explanations + the detail panel. */
export interface FolderMeta {
  path: string;
  name: string;
  fileCount: number;
  childFiles: string[];
  /** Notable file paths (highest fan-in) inside this folder. */
  keyFiles: string[];
}
