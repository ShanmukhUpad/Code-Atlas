import Anthropic from "@anthropic-ai/sdk";
import {
  buildUserPrompt,
  SYSTEM_PROMPT,
  type ExplainItem,
  type ExplainResult,
} from "@/lib/explain/prompt";

export const runtime = "nodejs";

const CLAUDE_MODEL = "claude-haiku-4-5-20251001";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";

interface Probe {
  ok: boolean;
  model: string;
  at: number;
}
let ollamaProbe: Probe | null = null;

// Prefer capable instruct models good at short JSON; skip embedding-only models
// (they can't chat) and reasoning models (they pollute output with <think>).
const MODEL_PREF = [
  "qwen2.5-coder",
  "qwen2.5",
  "llama3.2",
  "llama3.1",
  "llama3",
  "mistral",
  "gemma",
  "phi",
  "gpt-oss",
  "nemotron",
];
const EMBED_RE = /embed|bge|minilm/i;

function pickModel(names: string[]): string {
  const want = process.env.OLLAMA_MODEL;
  if (want && names.some((n) => n === want || n.startsWith(want))) return want;
  const usable = names.filter((n) => !EMBED_RE.test(n) && !/deepseek-r1/i.test(n));
  for (const pref of MODEL_PREF) {
    const hit = usable.find((n) => n.startsWith(pref));
    if (hit) return hit;
  }
  // last resort: any non-embedding model (reasoning models included)
  return usable[0] || names.find((n) => !EMBED_RE.test(n)) || "";
}

/** Detect a running Ollama and pick a model (cached, re-probes if stale). */
async function probeOllama(): Promise<Probe> {
  const now = Date.now();
  if (ollamaProbe && (ollamaProbe.ok || now - ollamaProbe.at < 15_000))
    return ollamaProbe;
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(500),
    });
    if (!res.ok) throw new Error("tags");
    const data = (await res.json()) as { models?: { name: string }[] };
    const names = (data.models ?? []).map((m) => m.name);
    const model = pickModel(names);
    ollamaProbe = { ok: !!model, model, at: now };
  } catch {
    ollamaProbe = { ok: false, model: "", at: now };
  }
  return ollamaProbe;
}

// Keep the model resident in memory between requests so we don't pay the
// (multi-second) load cost on every click.
const KEEP_ALIVE = "30m";

async function ollamaExplain(
  model: string,
  items: ExplainItem[],
): Promise<ExplainResult[]> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      format: "json",
      keep_alive: KEEP_ALIVE,
      // NOTE: don't set num_ctx here — a value different from the loaded model
      // forces Ollama to reload the whole model on every call (very slow).
      options: { temperature: 0.2, num_predict: 200 },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(items) },
      ],
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  const data = (await res.json()) as { message?: { content?: string } };
  const parsed = extractJson(data.message?.content ?? "");
  return Array.isArray(parsed?.items) ? parsed.items : [];
}

/** Load the model into memory ahead of time (empty generate call). */
async function warmOllama(model: string): Promise<void> {
  await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt: "", keep_alive: KEEP_ALIVE }),
    signal: AbortSignal.timeout(90_000),
  }).catch(() => {});
}

async function claudeExplain(
  apiKey: string,
  items: ExplainItem[],
): Promise<ExplainResult[]> {
  const client = new Anthropic({ apiKey });
  const msg = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1200,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(items) }],
  });
  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const parsed = extractJson(text);
  return Array.isArray(parsed?.items) ? parsed.items : [];
}

export async function POST(request: Request) {
  let items: ExplainItem[];
  let warmup = false;
  try {
    const body = (await request.json()) as {
      items?: ExplainItem[];
      warmup?: boolean;
    };
    items = (body.items ?? []).slice(0, 20);
    warmup = !!body.warmup;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Warmup: preload the model so the first real request isn't a cold start.
  if (warmup) {
    const probe = await probeOllama();
    if (probe.ok) void warmOllama(probe.model);
    return Response.json({ engine: probe.ok ? "ollama" : "none" });
  }

  if (!items.length) return Response.json({ items: [] });

  // Priority: local Ollama (free, unlimited) → Claude (if key) → heuristic.
  const probe = await probeOllama();
  if (probe.ok) {
    try {
      return Response.json({
        items: await ollamaExplain(probe.model, items),
        engine: "ollama",
      });
    } catch (err) {
      console.error("[/api/explain] ollama failed", err);
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      return Response.json({
        items: await claudeExplain(apiKey, items),
        engine: "claude",
      });
    } catch (err) {
      console.error("[/api/explain] claude failed", err);
      return Response.json({ error: "AI request failed" }, { status: 502 });
    }
  }

  return Response.json({ disabled: true });
}

/** Pull the first JSON object out of a model response, tolerating stray text. */
function extractJson(text: string): { items?: ExplainResult[] } | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}
