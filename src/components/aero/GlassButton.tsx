"use client";

import type { ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { playSfx, unlockAudio } from "@/lib/audio/sfx";

type Tone = "aqua" | "green" | "clear";

const TONE: Record<Tone, string> = {
  aqua: "from-aero-cyan/90 to-aero-blue/90 text-white",
  green: "from-aero-green/90 to-aero-cyan/90 text-white",
  clear: "from-white/80 to-white/40 text-ink",
};

/** Glossy capsule button with Wii U hover/click SFX baked in. */
export function GlassButton({
  children,
  tone = "aqua",
  className = "",
  onClick,
  onMouseEnter,
  ...rest
}: {
  children: ReactNode;
  tone?: Tone;
} & Omit<HTMLMotionProps<"button">, "children">) {
  return (
    <motion.button
      whileHover={{ scale: 1.04, y: -1 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      onMouseEnter={(e) => {
        playSfx("hover");
        onMouseEnter?.(e);
      }}
      onClick={(e) => {
        unlockAudio();
        playSfx("click");
        onClick?.(e);
      }}
      className={`candy font-display relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full border border-white/80 bg-gradient-to-b ${TONE[tone]} px-5 py-2.5 text-sm font-semibold shadow-[0_10px_22px_rgba(6,42,107,0.35),inset_0_2px_0_rgba(255,255,255,0.95),inset_0_-6px_12px_rgba(6,42,107,0.25)] backdrop-blur-md transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...rest}
    >
      <span className="relative z-10 flex items-center gap-2 drop-shadow-sm">
        {children}
      </span>
    </motion.button>
  );
}
