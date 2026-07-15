"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { GlassPanel } from "@/components/aero/GlassPanel";
import { GlassProgress } from "@/components/aero/GlassProgress";
import { UploadDropzone } from "./UploadDropzone";
import { GithubInput } from "./GithubInput";
import { useAtlas } from "@/store";
import { toRawFiles, type Picked } from "@/lib/input/read";
import { playSfx } from "@/lib/audio/sfx";

type Phase =
  | "idle"
  | "scanning"
  | "reading"
  | "fetching"
  | "building"
  | "done"
  | "error";

// Let the browser paint the current phase before the synchronous parse.
const tick = () =>
  new Promise<void>((r) =>
    requestAnimationFrame(() => requestAnimationFrame(() => r())),
  );

export function ImportPanel() {
  const router = useRouter();
  const loadFromRawFiles = useAtlas((s) => s.loadFromRawFiles);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [scanCount, setScanCount] = useState(0);
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const busy =
    phase === "scanning" ||
    phase === "reading" ||
    phase === "fetching" ||
    phase === "building" ||
    phase === "done";

  async function finish(
    files: { path: string; content: string }[],
    projectName: string,
    truncated: boolean,
  ) {
    if (files.length === 0) {
      setPhase("error");
      setError("No supported source files were found there.");
      return;
    }
    setPhase("building");
    await tick();
    loadFromRawFiles(files, projectName);
    if (truncated) setNote(`Large project — mapped the first ${files.length} files.`);
    setCount(files.length);
    setPhase("done");
    playSfx("success");
    await new Promise((r) => setTimeout(r, 850));
    router.push("/atlas");
  }

  const handleScanStart = () => {
    setError(null);
    setNote(null);
    setScanCount(0);
    setPhase("scanning");
  };

  const handlePicked = async (picked: Picked[], rootName?: string) => {
    setPhase("reading");
    setProgress({ done: 0, total: picked.length });
    try {
      const { files, projectName, truncated } = await toRawFiles(picked, {
        rootName,
        onProgress: (done, total) => setProgress({ done, total }),
      });
      await finish(files, projectName, truncated);
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : "Couldn't read that folder.");
    }
  };

  const handleGithub = async (url: string) => {
    setError(null);
    setNote(null);
    setPhase("fetching");
    try {
      const res = await fetch("/api/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to import repository.");
      await finish(data.files, data.projectName, data.truncated);
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  };

  return (
    <GlassPanel
      className="w-full max-w-xl p-6 pt-7 md:p-8 md:pt-9"
      style={{
        background:
          "linear-gradient(168deg, rgba(230,248,255,0.72) 0%, rgba(150,220,240,0.45) 46%, rgba(120,210,200,0.4) 100%)",
      }}
    >
      <div className="flex flex-col gap-5">
        <GithubInput onSubmit={handleGithub} busy={busy} />

        <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-widest text-ink-soft">
          <span className="h-px flex-1 bg-white/60" />
          or from files
          <span className="h-px flex-1 bg-white/60" />
        </div>

        <UploadDropzone
          onPicked={handlePicked}
          onScanStart={handleScanStart}
          onScanProgress={setScanCount}
          busy={busy}
        />

        <ProgressArea
          phase={phase}
          progress={progress}
          scanCount={scanCount}
          count={count}
          error={error}
          note={note}
        />
      </div>
    </GlassPanel>
  );
}

function ProgressArea({
  phase,
  progress,
  scanCount,
  count,
  error,
  note,
}: {
  phase: Phase;
  progress: { done: number; total: number };
  scanCount: number;
  count: number;
  error: string | null;
  note: string | null;
}) {
  const readPct = progress.total ? progress.done / progress.total : 0;

  return (
    <div className="min-h-[52px]">
      <AnimatePresence mode="wait">
        {phase === "scanning" && (
          <Wrap key="scanning">
            <Label>
              Scanning folder…{" "}
              <span className="text-ink-soft">
                {scanCount > 0 ? `${scanCount} files found` : "reading tree"}
              </span>
            </Label>
            <GlassProgress indeterminate />
          </Wrap>
        )}

        {phase === "reading" && (
          <Wrap key="reading">
            <Label>
              Reading files… {progress.done}
              <span className="text-ink-soft">/{progress.total || "…"}</span>
            </Label>
            <GlassProgress value={readPct} />
          </Wrap>
        )}

        {phase === "fetching" && (
          <Wrap key="fetching">
            <Label>Fetching repository…</Label>
            <GlassProgress indeterminate />
          </Wrap>
        )}

        {phase === "building" && (
          <Wrap key="building">
            <Label>Charting the codebase…</Label>
            <GlassProgress indeterminate />
          </Wrap>
        )}

        {phase === "done" && (
          <Wrap key="done">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 16 }}
              className="flex items-center justify-center gap-2 font-display text-base font-bold text-ink"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-b from-aero-mint to-aero-green text-white shadow-[0_0_14px_rgba(95,224,138,0.9)]">
                ✓
              </span>
              Mapped {count} file{count === 1 ? "" : "s"} — opening atlas…
            </motion.div>
          </Wrap>
        )}

        {phase === "error" && error && (
          <motion.p
            key="err"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-red-300/60 bg-red-50/80 px-3 py-2 text-center text-sm text-red-700"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {note && phase === "done" && (
        <p className="mt-1 text-center text-xs text-ink-soft">{note}</p>
      )}
    </div>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex flex-col gap-2"
    >
      {children}
    </motion.div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center font-display text-sm font-semibold text-ink">
      {children}
    </div>
  );
}
