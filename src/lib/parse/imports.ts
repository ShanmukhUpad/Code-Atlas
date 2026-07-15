// Lightweight, dependency-free extraction of imports/exports/header from JS/TS
// source. Not a full parser — regex heuristics tuned for real-world web code.

const IMPORT_RE =
  /import\s+(?:[\w*{}\n\s,]+?\s+from\s+)?["']([^"']+)["']/g;
const REQUIRE_RE = /require\(\s*["']([^"']+)["']\s*\)/g;
const DYNAMIC_IMPORT_RE = /import\(\s*["']([^"']+)["']\s*\)/g;
const EXPORT_FROM_RE = /export\s+(?:[\w*{}\n\s,]+?)\s+from\s+["']([^"']+)["']/g;

const NAMED_EXPORT_RE =
  /export\s+(?:async\s+)?(?:default\s+)?(?:const|let|var|function|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/g;
const EXPORT_LIST_RE = /export\s*\{([^}]+)\}/g;
const DEFAULT_EXPORT_RE = /export\s+default\b/;

/** Strip line + block comments so specifier regexes don't match commented code. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

export function extractImports(content: string): string[] {
  const src = stripComments(content);
  const specs = new Set<string>();
  for (const re of [IMPORT_RE, REQUIRE_RE, DYNAMIC_IMPORT_RE, EXPORT_FROM_RE]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) specs.add(m[1]);
  }
  return [...specs];
}

export function extractExports(content: string): string[] {
  const src = stripComments(content);
  const names = new Set<string>();
  let m: RegExpExecArray | null;

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

/** True if the file appears to contain JSX (used for role classification). */
export function hasJsx(content: string): boolean {
  const src = stripComments(content);
  // opening tag that isn't obviously a generic/comparison, returned or arrowed
  const hasTag = /<([A-Z][\w.]*|[a-z]+)(\s[^>]*)?\/?>/.test(src);
  const jsxContext = /(return|=>)\s*\(?\s*</.test(src);
  return hasTag && jsxContext;
}

/** Grab the leading comment block/lines at the very top of a file, if present. */
export function extractHeader(content: string): string | undefined {
  const trimmed = content.replace(/^﻿/, "").trimStart();
  let m = /^\/\*\*?([\s\S]*?)\*\//.exec(trimmed);
  if (m) {
    const text = m[1]
      .split("\n")
      .map((l) => l.replace(/^\s*\*?\s?/, "").trim())
      .filter(Boolean)
      .join(" ")
      .trim();
    return text || undefined;
  }
  m = /^((?:\/\/[^\n]*\n?)+)/.exec(trimmed);
  if (m) {
    const text = m[1]
      .split("\n")
      .map((l) => l.replace(/^\s*\/\/\s?/, "").trim())
      .filter(Boolean)
      .join(" ")
      .trim();
    return text || undefined;
  }
  return undefined;
}
