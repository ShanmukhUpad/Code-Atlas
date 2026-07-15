"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { GradientBackground } from "@/components/aero/GradientBackground";
import { GlassPanel } from "@/components/aero/GlassPanel";
import { AtlasCanvas } from "@/components/graph/AtlasCanvas";
import { DetailPanel } from "@/components/graph/DetailPanel";
import { ROLE_STYLES } from "@/components/graph/roleStyles";
import { useAtlas } from "@/store";
import { warmModel } from "@/lib/explain/client";
import { playSfx } from "@/lib/audio/sfx";

export default function AtlasPage() {
  const router = useRouter();
  const status = useAtlas((s) => s.status);
  const projectName = useAtlas((s) => s.projectName);
  const fileCount = useAtlas((s) => s.fileCount);

  useEffect(() => {
    if (status !== "ready") router.replace("/");
    else warmModel(); // preload the local model so the first click is fast
  }, [status, router]);

  if (status !== "ready") return null;

  return (
    <GradientBackground>
      <div className="font-display relative h-full w-full">
        <div className="absolute inset-0">
          <AtlasCanvas />
        </div>

        {/* top bar */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="pointer-events-none absolute left-4 top-4 z-20 flex items-center gap-3"
        >
          <Link
            href="/"
            onClick={() => playSfx("back")}
            className="pointer-events-auto"
          >
            <GlassPanel className="flex items-center gap-2 px-4 py-2">
              <span className="text-lg">←</span>
              <span className="text-sm font-bold text-ink">New map</span>
            </GlassPanel>
          </Link>
          <GlassPanel className="px-4 py-2">
            <div className="text-sm font-black text-ink text-shadow-aero">
              {projectName}
            </div>
            <div className="text-[11px] font-semibold text-ink-soft">
              {fileCount} files mapped
            </div>
          </GlassPanel>
        </motion.div>

        <Legend />
        <DetailPanel />
      </div>
    </GradientBackground>
  );
}

function Legend() {
  const roles = Object.entries(ROLE_STYLES);
  return (
    <div className="pointer-events-none absolute left-4 top-24 z-20">
      <GlassPanel className="px-3 py-2.5">
        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-soft">
          Legend
        </div>
        <div className="grid grid-cols-1 gap-1">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="grid h-3 w-3 place-items-center rounded-full border border-white/80 bg-gradient-to-b from-aero-aqua to-aero-cyan text-[7px]">
              📁
            </span>
            <span className="font-semibold text-ink">Folder</span>
          </div>
          {roles.map(([role, s]) => (
            <div key={role} className="flex items-center gap-2 text-[11px]">
              <span
                className="h-3 w-3 rounded-full border border-white/80"
                style={{
                  background: `linear-gradient(160deg, ${s.from}, ${s.to})`,
                }}
              />
              <span className="font-semibold text-ink">{s.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 max-w-[150px] border-t border-white/40 pt-1.5 text-[10px] leading-tight text-ink-soft">
          Click a folder to open it. Click a file for details.
        </div>
      </GlassPanel>
    </div>
  );
}
