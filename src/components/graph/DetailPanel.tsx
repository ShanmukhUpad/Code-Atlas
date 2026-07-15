"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useAtlas } from "@/store";
import { ensureHeuristic, requestAi } from "@/lib/explain/client";
import { playSfx } from "@/lib/audio/sfx";
import { ROLE_STYLES } from "./roleStyles";

const shortName = (p: string) => p.slice(p.lastIndexOf("/") + 1);

export function DetailPanel() {
  const selectedPath = useAtlas((s) => s.selectedPath);
  const file = useAtlas((s) =>
    s.selectedPath ? s.filesByPath[s.selectedPath] : undefined,
  );
  const folder = useAtlas((s) =>
    s.selectedPath ? s.foldersByPath[s.selectedPath] : undefined,
  );
  const explanation = useAtlas((s) =>
    s.selectedPath ? s.explanations[s.selectedPath] : undefined,
  );
  const aiLoading = useAtlas((s) =>
    s.selectedPath ? !!s.aiLoading[s.selectedPath] : false,
  );
  const select = useAtlas((s) => s.select);
  const revealPath = useAtlas((s) => s.revealPath);

  // Shows for both files and folders — folders get a summary of their role.
  const open = Boolean(file || folder);

  const goTo = (path: string) => {
    playSfx("select");
    revealPath(path); // expand ancestors so the target actually appears
    ensureHeuristic(path);
    void requestAi(path);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key={selectedPath}
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 30 }}
          className="glass gloss aero-scroll pointer-events-auto absolute right-4 top-4 z-30 flex max-h-[calc(100dvh-2rem)] w-[360px] flex-col overflow-y-auto rounded-3xl p-5"
        >
          <div className="relative z-10">
            <button
              onClick={() => {
                playSfx("back");
                select(null);
              }}
              onMouseEnter={() => playSfx("hover")}
              className="absolute right-0 top-0 grid h-8 w-8 place-items-center rounded-full bg-white/50 text-ink hover:bg-white/80"
              aria-label="Close"
            >
              ✕
            </button>

            {file ? (
              <>
                <RoleBadge role={file.role} />
                <h2 className="mt-2 break-all pr-8 text-lg font-black text-ink text-shadow-aero">
                  {file.name}
                </h2>
                <p className="mb-3 break-all font-mono text-[11px] text-ink-soft">
                  {file.path}
                </p>

                <Purpose text={explanation?.role} source={explanation?.source} loading={aiLoading} />

                <Stats
                  items={[
                    ["Lines", String(file.loc)],
                    ["Used by", String(file.fanIn)],
                    ["Depends on", String(file.fanOut)],
                  ]}
                />

                {file.exports.length > 0 && (
                  <Section title="Exports">
                    <Chips items={file.exports} />
                  </Section>
                )}
                {file.dependencies.length > 0 && (
                  <Section title="Depends on">
                    <LinkList paths={file.dependencies} onGo={goTo} />
                  </Section>
                )}
                {file.dependents.length > 0 && (
                  <Section title="Used by (related)">
                    <LinkList paths={file.dependents} onGo={goTo} />
                  </Section>
                )}
                {file.externalImports.length > 0 && (
                  <Section title="External packages">
                    <Chips items={file.externalImports} muted />
                  </Section>
                )}
              </>
            ) : folder ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/50 px-2.5 py-1 text-xs font-bold text-ink">
                  📁 Folder
                </span>
                <h2 className="mt-2 break-all pr-8 text-lg font-black text-ink text-shadow-aero">
                  {folder.name}
                </h2>
                <p className="mb-3 break-all font-mono text-[11px] text-ink-soft">
                  {folder.path === "." ? "project root" : folder.path}
                </p>
                <Purpose text={explanation?.role} source={explanation?.source} loading={aiLoading} />
                <Stats items={[["Files", String(folder.fileCount)]]} />
                {folder.keyFiles.length > 0 && (
                  <Section title="Key files">
                    <LinkList paths={folder.keyFiles} onGo={goTo} />
                  </Section>
                )}
              </>
            ) : null}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function RoleBadge({ role }: { role: keyof typeof ROLE_STYLES }) {
  const s = ROLE_STYLES[role];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold text-ink shadow-inner"
      style={{ background: `linear-gradient(160deg, ${s.from}, ${s.to})` }}
    >
      {s.label}
    </span>
  );
}

function Purpose({
  text,
  source,
  loading,
}: {
  text?: string;
  source?: "ai" | "heuristic";
  loading?: boolean;
}) {
  const showEnhancing = loading && source !== "ai";
  return (
    <div className="mb-4 rounded-2xl bg-white/40 p-3">
      <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-ink-soft">
        Role in the system
        {source && (
          <span
            className={`rounded-full px-1.5 py-0.5 text-[9px] ${
              source === "ai"
                ? "bg-[#9b7bff]/40 text-ink"
                : "bg-white/60 text-ink-soft"
            }`}
          >
            {source === "ai" ? "AI" : "heuristic"}
          </span>
        )}
        {showEnhancing && (
          <span className="animate-pulse rounded-full bg-[#9b7bff]/30 px-1.5 py-0.5 text-[9px] text-ink normal-case tracking-normal">
            enhancing…
          </span>
        )}
      </div>
      <p className="text-[13px] leading-relaxed text-ink">
        {text ?? "Analyzing…"}
      </p>
    </div>
  );
}

function Stats({ items }: { items: [string, string][] }) {
  return (
    <div className="mb-4 grid grid-cols-3 gap-2">
      {items.map(([label, val]) => (
        <div
          key={label}
          className="rounded-xl bg-white/40 px-2 py-1.5 text-center"
        >
          <div className="text-base font-black text-ink">{val}</div>
          <div className="text-[10px] font-semibold text-ink-soft">{label}</div>
        </div>
      ))}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Chips({ items, muted }: { items: string[]; muted?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => (
        <span
          key={it}
          className={`rounded-lg px-2 py-0.5 font-mono text-[11px] ${
            muted ? "bg-white/30 text-ink-soft" : "bg-white/55 text-ink"
          }`}
        >
          {it}
        </span>
      ))}
    </div>
  );
}

function LinkList({
  paths,
  onGo,
}: {
  paths: string[];
  onGo: (p: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      {paths.map((p) => (
        <button
          key={p}
          onClick={() => onGo(p)}
          onMouseEnter={() => playSfx("hover")}
          className="group flex items-center gap-2 rounded-lg bg-white/35 px-2.5 py-1.5 text-left text-[12px] text-ink transition-colors hover:bg-white/70"
          title={p}
        >
          <span className="text-aero-blue">→</span>
          <span className="truncate font-medium">{shortName(p)}</span>
          <span className="ml-auto truncate font-mono text-[10px] text-ink-soft opacity-0 transition-opacity group-hover:opacity-100">
            {p}
          </span>
        </button>
      ))}
    </div>
  );
}
