import type { Explanation, FileMeta, FolderMeta, NodeRole } from "@/types";

const ROLE_LABEL: Record<NodeRole, string> = {
  entry: "an entry point",
  hub: "a core module",
  orchestrator: "a coordinator",
  component: "a UI component",
  util: "a helper module",
  config: "a configuration file",
  file: "a standalone file",
};

const ROLE_PLURAL: Record<NodeRole, string> = {
  entry: "entry points",
  hub: "core modules",
  orchestrator: "coordinators",
  component: "UI components",
  util: "helpers",
  config: "config files",
  file: "files",
};

function pretty(paths: string[], max = 3): string {
  const names = paths.map((p) => p.slice(p.lastIndexOf("/") + 1));
  if (names.length <= max) return names.join(", ");
  return `${names.slice(0, max).join(", ")} +${names.length - max} more`;
}

function firstSentence(text: string, limit = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  const end = clean.search(/[.!?]\s/);
  const s = end === -1 ? clean : clean.slice(0, end + 1);
  return s.length > limit ? s.slice(0, limit - 1).trimEnd() + "…" : s;
}

/** Heuristic explanation for a single file, framed by its role in the system. */
export function explainFile(f: FileMeta): Explanation {
  const roleText = ROLE_LABEL[f.role];
  const header = f.header ? firstSentence(f.header) : "";

  // ---- hover summary ----
  let summary: string;
  if (header) {
    summary = header;
  } else if (f.role === "entry") {
    summary = `Entry point — the app reaches this file directly (${f.exports.length} export${f.exports.length === 1 ? "" : "s"}).`;
  } else if (f.role === "hub") {
    summary = `Core module used by ${f.fanIn} other file${f.fanIn === 1 ? "" : "s"} — changes here ripple widely.`;
  } else if (f.role === "component") {
    summary = `UI component${f.fanIn ? `, rendered by ${f.fanIn} file${f.fanIn === 1 ? "" : "s"}` : ""}.`;
  } else if (f.role === "orchestrator") {
    summary = `Coordinator that pulls together ${f.fanOut} module${f.fanOut === 1 ? "" : "s"}.`;
  } else if (f.fanIn === 0 && f.fanOut === 0) {
    summary = `Standalone file with no in-project dependencies detected.`;
  } else {
    summary = `Helper used by ${f.fanIn} file${f.fanIn === 1 ? "" : "s"}; depends on ${f.fanOut}.`;
  }

  // ---- detail: role in the system ----
  const parts: string[] = [];
  parts.push(
    `\`${f.name}\` is ${roleText} in this project${
      f.dir ? ` (under \`${f.dir}\`)` : ""
    }.`,
  );
  if (header) parts.push(`Its header notes: “${header}”.`);
  if (f.fanOut > 0)
    parts.push(`It builds on ${f.fanOut} internal module${f.fanOut === 1 ? "" : "s"} (${pretty(f.dependencies)}).`);
  else parts.push(`It relies only on external packages, not other project files.`);
  if (f.fanIn > 0)
    parts.push(`${f.fanIn} file${f.fanIn === 1 ? "" : "s"} depend on it (${pretty(f.dependents)}), so it is ${f.fanIn >= 4 ? "load-bearing" : "shared"}.`);
  else parts.push(`Nothing else imports it — it is a leaf in the dependency tree.`);
  if (f.exports.length)
    parts.push(`Exposes: ${f.exports.slice(0, 6).join(", ")}${f.exports.length > 6 ? "…" : ""}.`);

  return { path: f.path, summary, role: parts.join(" "), source: "heuristic" };
}

/** Heuristic explanation for a folder, aggregated from its files. */
export function explainFolder(
  folder: FolderMeta,
  filesByPath: Record<string, FileMeta>,
): Explanation {
  const files = folder.childFiles
    .map((p) => filesByPath[p])
    .filter(Boolean) as FileMeta[];
  const roleCount = new Map<NodeRole, number>();
  for (const f of files) roleCount.set(f.role, (roleCount.get(f.role) ?? 0) + 1);
  const dominant = [...roleCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  const isRoot = folder.path === ".";
  const summary = `${isRoot ? "The whole project" : "Folder"} — ${folder.fileCount} file${
    folder.fileCount === 1 ? "" : "s"
  }${dominant ? `, mostly ${ROLE_PLURAL[dominant]}` : ""}.`;

  const parts: string[] = [];
  parts.push(
    `\`${folder.name}\` ${isRoot ? "spans" : "groups"} ${folder.fileCount} source file${
      folder.fileCount === 1 ? "" : "s"
    }.`,
  );
  if (dominant)
    parts.push(`It is mostly ${ROLE_PLURAL[dominant]}.`);
  if (folder.keyFiles.length)
    parts.push(`The most-depended-on files here are ${pretty(folder.keyFiles)}.`);

  // outward coupling: dependencies pointing outside this folder
  const outward = new Set<string>();
  for (const f of files) {
    for (const d of f.dependencies) {
      const ddir = d.includes("/") ? d.slice(0, d.lastIndexOf("/")) : "";
      if (ddir !== folder.path && !ddir.startsWith(folder.path + "/"))
        outward.add(ddir || "the project root");
    }
  }
  if (outward.size && !isRoot)
    parts.push(
      `It reaches into other areas: ${[...outward].slice(0, 4).join(", ")}.`,
    );

  return {
    path: folder.path,
    summary,
    role: parts.join(" "),
    source: "heuristic",
  };
}
