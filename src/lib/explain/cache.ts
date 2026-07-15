"use client";

import type { Explanation } from "@/types";

// Persist AI explanations per project so they're generated once, ever — even
// the Claude path becomes effectively free on re-open.
const keyFor = (project: string) => `atlas:exp:${project}`;

export function loadCache(project: string): Record<string, Explanation> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(keyFor(project));
    return raw ? (JSON.parse(raw) as Record<string, Explanation>) : {};
  } catch {
    return {};
  }
}

export function saveCacheEntry(project: string, exp: Explanation): void {
  if (typeof window === "undefined" || exp.source !== "ai") return;
  try {
    const cur = loadCache(project);
    cur[exp.path] = exp;
    window.localStorage.setItem(keyFor(project), JSON.stringify(cur));
  } catch {
    // storage full / unavailable — non-fatal, we just won't cache.
  }
}
