@AGENTS.md

# Code Atlas

Interactive tool that turns an unfamiliar codebase into an explorable **JRPG skill tree** with a **Frutiger Aero** aesthetic. Upload a folder or paste a GitHub URL → the app parses JS/TS files, builds a dependency graph, and renders it as glowing skill nodes/edges. Hover a node for an AI/heuristic explanation of its role *in the system*; click for full details.

## Stack
- Next.js 16 (App Router, TS) — note the `AGENTS.md` warning: this Next has breaking changes, check `node_modules/next/dist/docs/` when unsure.
- Tailwind CSS **v4** (CSS-first config in `src/app/globals.css` via `@theme`; there is no `tailwind.config.ts`).
- `@xyflow/react` (React Flow) — graph canvas. Must render client-side.
- `framer-motion` — animations.
- `@dagrejs/dagre` — layered skill-tree layout.
- `zustand` — graph + selection + audio state (`src/store.ts`).
- `@aero-ui/tokens` — Frutiger Aero design tokens (colors/spacings/radii); JS object, web-safe. Used to seed the theme.
- `@anthropic-ai/sdk` — optional AI explanations via `/api/explain`.

## Architecture
- **Input** → `RawFile[] { path, content }`. Folder upload (`webkitdirectory`, client-side) or GitHub URL (`/api/github`). JS/TS only (`.js .jsx .ts .tsx .mjs .cjs`).
- **Parse** (`src/lib/parse/`) — lightweight regex extraction of imports/exports; resolve relative specifiers (extensionless + `/index`) to project files → dependency edges.
- **Graph** (`src/lib/graph/build.ts`) — file nodes, folder group nodes, dependency edges, fan-in/fan-out metrics for role classification.
- **Layout** (`src/lib/graph/layout.ts`) — dagre layered positions fed to React Flow.
- **Explain** (`src/lib/explain/`) — `heuristic.ts` classifies role (entry/hub/orchestrator/component/util) and folds in the file's leading comment; describes files **and** folders. Upgrades to Claude via `/api/explain` when `ANTHROPIC_API_KEY` is set; graceful fallback otherwise. Cached in the store.
- **Render** — custom glass nodes/edges, hover tooltip, click detail panel.
- **Audio** (`src/lib/audio/`) — YouTube background music (gesture-gated toggle) + Wii U hover/click SFX from `public/sounds/`.

## Conventions
- React Flow, framer-motion, audio, and anything touching `window` must be in `'use client'` components.
- Keep the aero look consistent: use the `.glass*` utilities and theme colors in `globals.css`; don't hardcode ad-hoc colors.
- Audio no-ops gracefully if a sound file is missing. Map defaults live in `src/lib/audio/sfx.ts`; the full Wii U set is under `public/sounds/wiiu/`.

## Env
Copy `.env.example` → `.env.local`. `ANTHROPIC_API_KEY` (optional, enables AI explanations), `GITHUB_TOKEN` (optional, lifts GitHub API rate limits).

## Commands
- `npm run dev` — dev server.
- `npm run build` — production build.
- `npx tsc --noEmit` — typecheck.
