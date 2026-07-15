// Shared shapes + prompt construction for AI explanations.

export interface ExplainItem {
  path: string;
  kind: "file" | "folder";
  name: string;
  /** Source language: "js", "py", or "sv" (SystemVerilog/Verilog). */
  lang?: string;
  role?: string;
  dir?: string;
  exports?: string[];
  /** short names of in-project dependencies */
  dependencies?: string[];
  /** short names of files that depend on this */
  dependents?: string[];
  header?: string;
  fileCount?: number;
  keyFiles?: string[];
}

export interface ExplainResult {
  path: string;
  summary: string;
  role: string;
}

export const SYSTEM_PROMPT = `You are Code Atlas, a guide that helps developers understand an unfamiliar codebase.
For each file or folder you are given structured facts (its role, what it imports, what imports it, its exports, and any header comment).
The "lang" field tells you the source kind: "js" (JS/TS), "py" (Python), "c" (C/C++), "java" (Java), "cs" (C#, often Unity), "html", "shader" (Unity ShaderLab/HLSL), "cmake" (CMake build), "json" (config/data), "ipynb" (Jupyter notebook), or "sv" (SystemVerilog/Verilog hardware). Interpret the facts accordingly — for "sv", "exports" are the modules/interfaces/packages it declares, "dependencies" are modules it instantiates / packages it imports / files it \`include\`s, and "dependents" are modules that instantiate it, so describe it in hardware terms (RTL blocks, instantiation hierarchy, testbenches). For "c"/"java"/"cs", dependencies are the includes/imports/types it uses; for "cs" think Unity components (MonoBehaviour scripts) when it fits. For "shader" describe the rendering pass and its shared includes; for "cmake" the build targets and subdirectories; for "html" the page and its linked assets; for "json" the config/data it holds; for "ipynb" the notebook's analysis and the modules it uses.
Explain what it does and its role in the wider system. Be concise — no filler.
Return STRICT JSON only, no prose outside JSON, matching:
{"items":[{"path":"...","summary":"one clause, <= 12 words","role":"1-2 short sentences, <= 35 words total, on its purpose and place in the system"}]}
Be specific to the facts provided. Never invent file names or behavior not implied by the facts.`;

export function buildUserPrompt(items: ExplainItem[]): string {
  return `Explain these ${items.length} item(s):\n\n${JSON.stringify(items, null, 2)}`;
}
