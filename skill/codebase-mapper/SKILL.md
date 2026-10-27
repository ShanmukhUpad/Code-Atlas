---
name: codebase-mapper
description: Map an unfamiliar codebase so a newcomer can find their way around it. Parses imports into a dependency graph (JS/TS, Python, Go, Java, C/C++/CUDA, C#, SystemVerilog/Verilog, HTML, shaders, CMake, notebooks), classifies every file's role (entry point, core module, coordinator, component, helper, config), then has you read the important files and explain each one's place in the system. Writes CODEBASE_MAP.md (overview, where to start, folder diagram, file table) and an interactive skill-tree page. Use when someone asks to map, tour, onboard onto, or explain the structure or architecture of a repo, asks "where do I start", "what calls what", or "what does each file do", or is about to work in code they have not seen before.
---

# Codebase Mapper

Turns a repository into a map: what the entry points are, which modules everything leans on, what each folder is for, and the order to read things in. The scripts do the parsing and the drawing; you do the part a parser cannot, which is reading the code and saying what it is for.

In the commands below `<skill>` is this skill's folder. The scripts need Node 18+ and install nothing.

## 1. Map the graph

```bash
node <skill>/scripts/map.mjs <repo> [--out <dir>] [--limit <n>]
```

- `<repo>` is the project root, or a subfolder to map only that part of a large repo.
- Output goes to `<repo>/.codebase-map/` unless `--out` says otherwise. Suggest adding it to `.gitignore`.
- `--limit` caps how many files go on the to-explain list (default 80, ranked by entry points first, then by how much depends on them).

Read the printed summary. It lists languages, role counts, entry points, the most depended-on files, top-level folders and the main external packages. `todo.json` holds the folders and files to explain, each with its role, imports, dependents, exports and header comment.

Roles come from fan-in/fan-out and naming, so they are a starting point, not a verdict. A "hub" is imported by four or more files; an "orchestrator" pulls in many; "entry" means a framework entry name, a `main`, or nothing imports it.

## 2. Read, then explain

Explain from the code, not from the file name. For every file in `todo.json`:

- Entry points, hubs and orchestrators: open and read the file.
- Everything else: read at least the top of the file and its exports. Read more when the name and header leave the purpose unclear.

Then write `<out>/explanations.json`:

```json
{
  "overview": "3-5 sentences: what this project is, its main parts, and how a request or a piece of data travels from an entry point through the core modules.",
  "readingOrder": [
    { "path": "src/app/page.tsx", "why": "The entry point; shows what the app does first." }
  ],
  "items": [
    { "path": "src/store.ts", "summary": "Global graph, selection and audio state", "role": "Zustand store every canvas component reads from; holds the parsed graph, which folders are open, and cached explanations." }
  ]
}
```

Rules for the text:

- `summary`: one clause, 12 words or fewer, shown on hover.
- `role`: one or two sentences, 35 words or fewer, on what it does and where it sits in the system (who calls it, what it hands off to).
- Folders get an item too: what lives there and how it relates to its neighbours.
- `readingOrder`: 5 to 8 files a newcomer should read first, in order, each with one reason.
- Only state what the code shows. Never invent behaviour, file names or history. If a file's purpose is unclear after reading it, say what it contains and that its use is unclear.
- Paths must match `todo.json` exactly. Anything you leave out falls back to a heuristic description built from the graph.
- Plain, specific language. No "robust", "seamless", "leverages", "plays a crucial role".

For a large repo, explain all folders and the top of the list first, render, then continue down the list if the user wants more.

## 3. Render

```bash
node <skill>/scripts/render.mjs <out> [--md <path>] [--no-html]
```

This writes:

- `CODEBASE_MAP.md`: the overview, "Where to start", a Mermaid diagram of which folders import which, a section per folder, and a table of every file with its role, fan-in, fan-out and summary.
- `codebase-map.html`: a self-contained skill tree. Folders expand on click, file gems are coloured by role, and selecting a file draws its imports (blue) and dependents (pink) and shows your explanation. It works offline; open it in any browser.

`--md` writes the Markdown somewhere else, such as `docs/ARCHITECTURE.md`, when the user wants it in the repo.

## 4. Report

Tell the user where the two files are, give the overview and the reading order in a few lines, and point out anything structural worth knowing: circular imports between folders, one file that half the project depends on, dead files nothing imports, entry points that look unused. Then answer their questions using the map; re-read the code itself when a question goes deeper than the map.

## Limits

- Imports are found with patterns, not a compiler. Dynamic imports built from strings, dependency injection, reflection and runtime plugin loading are missed, so a file can look unused when it is not. Say so when it matters.
- TypeScript path aliases other than `@/` and `~/` are treated as external packages.
- Files over 1 MB, lockfiles, `.d.ts` files and dependency or build folders (`node_modules`, `dist`, `.venv`, `target`, …) are skipped.
