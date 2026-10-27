#!/usr/bin/env node
// Step 1 of the skill: parse a project into a dependency graph with roles.
// usage: node map.mjs <repo> [--out <dir>] [--limit <n>]
// Writes <out>/graph.json and <out>/todo.json, prints a summary to read.
import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve, relative, sep } from "node:path";
import { parseProject, isCodeFile } from "./lib/atlas.mjs";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};
const root = resolve(args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--")) ?? ".");
const out = resolve(flag("--out", join(root, ".codebase-map")));
const limit = Number(flag("--limit", 80));

// Directories never worth walking, on top of the parser's own ignore list.
const SKIP_DIR = new Set([
  "node_modules", ".git", ".next", "dist", "build", "out", "coverage", ".turbo", ".vercel",
  ".venv", "venv", "env", "__pycache__", ".mypy_cache", ".pytest_cache", "target", "vendor",
  "Library", "Temp", "obj", ".codebase-map", ".idea", ".vscode",
]);
const MAX_BYTES = 1_000_000;

function walk(dir, files) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIR.has(entry.name)) walk(abs, files);
      continue;
    }
    if (!entry.isFile()) continue;
    const path = relative(root, abs).split(sep).join("/");
    if (!isCodeFile(path) || statSync(abs).size > MAX_BYTES) continue;
    files.push({ path, content: readFileSync(abs, "utf8") });
  }
  return files;
}

const raw = walk(root, []);
if (!raw.length) {
  console.error(`No supported source files under ${root}.`);
  process.exit(1);
}
const { files, folders } = parseProject(raw);

// Rank files by how much a newcomer needs them: entry points first, then by reach.
const ROLE_WEIGHT = { entry: 40, hub: 30, orchestrator: 25, component: 10, util: 5, config: 3, file: 0 };
const score = (f) => ROLE_WEIGHT[f.role] + f.fanIn * 3 + f.fanOut + Math.min(f.loc, 400) / 100;
const ranked = [...files].sort((a, b) => score(b) - score(a));

const short = (p) => p.slice(p.lastIndexOf("/") + 1);
const todo = {
  folders: folders
    .filter((d) => d.fileCount > 1 || d.path.split("/").length === 1)
    .map((d) => ({ path: d.path, kind: "folder", fileCount: d.fileCount, keyFiles: d.keyFiles })),
  files: ranked.slice(0, limit).map((f) => ({
    path: f.path,
    kind: "file",
    lang: f.lang,
    role: f.role,
    loc: f.loc,
    exports: f.exports.slice(0, 12),
    dependencies: f.dependencies.map(short),
    dependents: f.dependents.map(short),
    header: f.header,
  })),
};

const graph = {
  root: root.split(sep).pop(),
  generatedAt: new Date().toISOString(),
  // Raw per-language import lists are already resolved into dependencies.
  files: files.map((f) => {
    const copy = { ...f };
    for (const k of ["pyImports", "svImports", "svIncludes", "svRefs", "cIncludes", "javaImports", "csRefs"]) delete copy[k];
    return copy;
  }),
  folders,
};

mkdirSync(out, { recursive: true });
writeFileSync(join(out, "graph.json"), JSON.stringify(graph));
writeFileSync(join(out, "todo.json"), JSON.stringify(todo, null, 2));

// ---- summary for the agent to read ----
const count = (key) =>
  Object.entries(files.reduce((m, f) => ((m[f[key]] = (m[f[key]] ?? 0) + 1), m), {}))
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${k} ${n}`)
    .join(", ");
const external = Object.entries(
  files.flatMap((f) => f.externalImports).reduce((m, e) => ((m[e] = (m[e] ?? 0) + 1), m), {}),
)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15)
  .map(([k]) => k);
const line = (f) => `  ${f.path}  [${f.role}, in ${f.fanIn} / out ${f.fanOut}, ${f.loc} lines]`;

console.log(`Mapped ${files.length} files in ${folders.length} folders under ${graph.root}`);
console.log(`Languages: ${count("lang")}`);
console.log(`Roles: ${count("role")}`);
if (external.length) console.log(`Most-used external packages: ${external.join(", ")}`);
console.log(`\nEntry points:`);
for (const f of files.filter((f) => f.role === "entry").slice(0, 15)) console.log(line(f));
console.log(`\nMost depended on:`);
for (const f of [...files].sort((a, b) => b.fanIn - a.fanIn).slice(0, 12).filter((f) => f.fanIn > 0))
  console.log(line(f));
console.log(`\nTop-level folders:`);
for (const d of folders.filter((d) => !d.path.includes("/")))
  console.log(`  ${d.path}/  ${d.fileCount} files; key: ${d.keyFiles.map(short).join(", ")}`);
const unlinked = files.filter((f) => f.fanIn === 0 && f.fanOut === 0).length;
if (unlinked) console.log(`\n${unlinked} files have no detected in-project links.`);
console.log(
  `\nWrote ${relative(process.cwd(), join(out, "graph.json"))} and todo.json ` +
    `(${todo.folders.length} folders, ${todo.files.length} of ${files.length} files to explain).`,
);
