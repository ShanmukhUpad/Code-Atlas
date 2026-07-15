import type { RawFile } from "@/types";
import { isCodeFile } from "@/lib/parse";

const MAX_FILES = 500;
const MAX_FILE_BYTES = 200_000;
const CONCURRENCY = 12;

export interface RepoResult {
  files: RawFile[];
  projectName: string;
  truncated: boolean;
}

interface ParsedUrl {
  owner: string;
  repo: string;
  branch?: string;
  subdir: string;
}

/** Accept github.com URLs, optionally with /tree/<branch>/<subdir>. */
export function parseRepoUrl(input: string): ParsedUrl | null {
  let s = input.trim();
  if (!s) return null;
  s = s.replace(/^git@github\.com:/, "https://github.com/").replace(/\.git$/, "");
  if (!/^https?:\/\//.test(s)) s = `https://${s}`;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  if (!/(^|\.)github\.com$/.test(u.hostname)) return null;
  const segs = u.pathname.split("/").filter(Boolean);
  if (segs.length < 2) return null;
  const [owner, repo, kind, branch, ...rest] = segs;
  return {
    owner,
    repo,
    branch: kind === "tree" ? branch : undefined,
    subdir: kind === "tree" ? rest.join("/") : "",
  };
}

function ghHeaders(): HeadersInit {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "code-atlas",
  };
  if (process.env.GITHUB_TOKEN)
    h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

async function ghJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: ghHeaders() });
  if (res.status === 403 || res.status === 429) {
    throw new Error(
      "GitHub rate limit reached. Add a GITHUB_TOKEN to .env.local and retry.",
    );
  }
  if (res.status === 404)
    throw new Error("Repository or branch not found (is it public?).");
  if (!res.ok) throw new Error(`GitHub API error (${res.status}).`);
  return (await res.json()) as T;
}

interface TreeItem {
  path: string;
  type: "blob" | "tree";
  size?: number;
}

/** Fetch a public GitHub repo's JS/TS files as RawFile[]. */
export async function fetchRepo(input: string): Promise<RepoResult> {
  const parsed = parseRepoUrl(input);
  if (!parsed) throw new Error("That doesn't look like a GitHub repo URL.");
  const { owner, repo, subdir } = parsed;

  let branch = parsed.branch;
  if (!branch) {
    const info = await ghJson<{ default_branch: string }>(
      `https://api.github.com/repos/${owner}/${repo}`,
    );
    branch = info.default_branch;
  }

  const tree = await ghJson<{ tree: TreeItem[]; truncated: boolean }>(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
  );

  const prefix = subdir ? subdir.replace(/\/$/, "") + "/" : "";
  const blobs = tree.tree.filter(
    (t) =>
      t.type === "blob" &&
      (!prefix || t.path.startsWith(prefix)) &&
      isCodeFile(t.path) &&
      (t.size ?? 0) <= MAX_FILE_BYTES,
  );

  const truncated = tree.truncated || blobs.length > MAX_FILES;
  const selected = blobs.slice(0, MAX_FILES);

  const files: RawFile[] = [];
  for (let i = 0; i < selected.length; i += CONCURRENCY) {
    const batch = selected.slice(i, i + CONCURRENCY);
    const fetched = await Promise.all(
      batch.map(async (t): Promise<RawFile | null> => {
        const raw = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${t.path
          .split("/")
          .map(encodeURIComponent)
          .join("/")}`;
        const res = await fetch(raw, {
          headers: { "User-Agent": "code-atlas" },
        });
        if (!res.ok) return null;
        const content = await res.text();
        // Path relative to the chosen subdir root.
        const rel = prefix ? t.path.slice(prefix.length) : t.path;
        return { path: rel, content };
      }),
    );
    for (const f of fetched) if (f) files.push(f);
  }

  const projectName = subdir ? `${repo}/${subdir}` : `${owner}/${repo}`;
  return { files, projectName, truncated };
}
