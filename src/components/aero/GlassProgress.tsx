"use client";

import { motion } from "framer-motion";

/** Glossy Frutiger-Aero progress bar. Determinate when `value` is given. */
export function GlassProgress({
  value,
  indeterminate,
}: {
  value?: number; // 0..1
  indeterminate?: boolean;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value ?? 0)) * 100);
  return (
    <div
      className="relative h-3.5 w-full overflow-hidden rounded-full border border-white/70"
      style={{
        background:
          "linear-gradient(180deg, rgba(40,120,180,0.35), rgba(20,70,130,0.4))",
        boxShadow:
          "inset 0 2px 5px rgba(4,30,70,0.45), inset 0 -1px 0 rgba(255,255,255,0.35)",
      }}
    >
      {indeterminate ? (
        <motion.div
          className="absolute inset-y-0 w-1/3 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, #7ff0e6, #4aa8ff, transparent)",
          }}
          animate={{ x: ["-120%", "360%"] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : (
        <motion.div
          className="candy absolute inset-y-0 left-0 rounded-full"
          style={{
            background: "linear-gradient(180deg, #b8f7c0, #33d6f2 60%, #1560d4)",
            boxShadow: "0 0 12px rgba(127,240,230,0.8)",
          }}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 26 }}
        />
      )}
    </div>
  );
}
