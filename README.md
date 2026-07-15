# Codebase Mapper

**Live:** [codebase-mapper.vercel.app](https://codebase-mapper.vercel.app)

Turn an unfamiliar codebase into an explorable **JRPG skill tree**. Upload a folder or paste a GitHub URL, and Codebase Mapper parses the project, builds its dependency graph, and renders it as a living map — files are glowing skill gems, folders are collapsible nodes, and imports are the paths between them. Hover for an explanation of a file's role _in the system_; click to drill in.

The look is deliberately **Frutiger Aero** — glossy aqua glass, chrome, bubbles, that late-2000s Wii vibe — with a matching soundtrack and Wii U menu sound effects.

## Features

- **Drill-down skill tree** — starts at the root; click folders to expand, collapse to simplify. Auto-fits as it grows.
- **Dependency graph** — hexagonal skill-gem nodes colored by role (entry, core, coordinator, component, helper, config), glowing branch + dependency edges, and a "locked/unlocked" highlight for a selected file's connected subtree.
- **Multi-language parsing** — JS/TS (relative imports + `@/`/`~/` aliases), Python (dotted-module / relative imports with `__init__.py`), C/C++/CUDA (`#include`), Go (package imports), C# (type references, Unity-aware), Java (package imports), SystemVerilog/Verilog (module instantiation, package imports, `` `include ``), Unity ShaderLab/HLSL (`#include`), CMake (`add_subdirectory`/`include`), HTML (linked assets), plus JSON and Jupyter notebooks.
- **AI explanations, free & local** — descriptions come from a local [Ollama](https://ollama.com) model (free, unlimited, private), falling back to Claude if a key is set, then to a heuristic. Results are cached in the browser.
- **Folder + file import** — File System Access API picker (prunes `node_modules`/`.git` before scanning) or GitHub URL, with real upload progress.
- **Frutiger Aero UI** — custom glass/gloss components, chrome mirror-spheres, film grain, background music, and hover/click SFX.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · [React Flow](https://reactflow.dev) (`@xyflow/react`) · Framer Motion · dagre · Zustand.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`npm run dev` also starts a local Ollama server if one isn't already running (it no-ops if Ollama isn't installed).

### AI descriptions (optional but recommended)

Free and local via Ollama:

```bash
# install from https://ollama.com, then pull a model:
ollama pull nemotron-mini        # fast on CPU (~4s/description)
# or: ollama pull qwen2.5-coder:7b   # best code quality
```

It's auto-detected on `localhost:11434` — no config needed. See `.env.example` for options (`OLLAMA_MODEL`, `ANTHROPIC_API_KEY`, `GITHUB_TOKEN`). Without any model, Code Atlas uses solid heuristic descriptions.

## Scripts

- `npm run dev` — Next dev server + Ollama.
- `npm run dev:next` — Next only.
- `npm run build` — production build.
- `npm run lint` — ESLint.
