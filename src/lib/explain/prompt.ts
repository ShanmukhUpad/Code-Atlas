// Shared shapes + prompt construction for AI explanations.

export interface ExplainItem {
  path: string;
  kind: "file" | "folder";
  name: string;
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
Explain what it does and its role in the wider system. Be concise — no filler.
Return STRICT JSON only, no prose outside JSON, matching:
{"items":[{"path":"...","summary":"one clause, <= 12 words","role":"1-2 short sentences, <= 35 words total, on its purpose and place in the system"}]}
Be specific to the facts provided. Never invent file names or behavior not implied by the facts.`;

export function buildUserPrompt(items: ExplainItem[]): string {
  return `Explain these ${items.length} item(s):\n\n${JSON.stringify(items, null, 2)}`;
}
