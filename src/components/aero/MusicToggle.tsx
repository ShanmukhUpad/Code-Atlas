"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAtlas } from "@/store";
import { music } from "@/lib/audio/music";
import { playSfx, unlockAudio } from "@/lib/audio/sfx";

/** Floating glass cluster: background-music toggle + global mute. */
export function MusicToggle() {
  const musicOn = useAtlas((s) => s.musicOn);
  const muted = useAtlas((s) => s.muted);
  const toggleMusic = useAtlas((s) => s.toggleMusic);
  const toggleMute = useAtlas((s) => s.toggleMute);
  const containerRef = useRef<HTMLDivElement>(null);
  const initedRef = useRef(false);

  useEffect(() => {
    if (musicOn) {
      if (!initedRef.current && containerRef.current) {
        initedRef.current = true;
        void music.init(containerRef.current);
      }
      music.play();
    } else {
      music.pause();
    }
  }, [musicOn]);

  useEffect(() => {
    music.setMuted(muted);
  }, [muted]);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2">
      {/* hidden YouTube player mount point */}
      <div className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0">
        <div ref={containerRef} />
      </div>

      <ControlButton
        active={musicOn}
        label={musicOn ? "Pause music" : "Play music"}
        onClick={() => {
          unlockAudio();
          playSfx("click");
          toggleMusic();
        }}
      >
        <NoteIcon playing={musicOn} />
      </ControlButton>

      <ControlButton
        active={!muted}
        label={muted ? "Unmute" : "Mute"}
        onClick={() => {
          playSfx("click");
          toggleMute();
        }}
      >
        {muted ? <MutedIcon /> : <SpeakerIcon />}
      </ControlButton>
    </div>
  );
}

function ControlButton({
  children,
  active,
  label,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.08, y: -2 }}
      whileTap={{ scale: 0.94 }}
      onMouseEnter={() => playSfx("hover")}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`gloss relative grid h-12 w-12 place-items-center overflow-hidden rounded-full border border-white/70 backdrop-blur-md ${
        active
          ? "bg-gradient-to-b from-aero-aqua to-aero-cyan text-ink shadow-[0_0_18px_rgba(127,240,230,0.8)]"
          : "bg-white/45 text-ink-soft"
      }`}
    >
      <span className="relative z-10">{children}</span>
      <AnimatePresence>
        {active && (
          <motion.span
            className="absolute inset-0 rounded-full ring-2 ring-white/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function NoteIcon({ playing }: { playing: boolean }) {
  return (
    <motion.svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      animate={playing ? { rotate: [0, -8, 8, 0] } : { rotate: 0 }}
      transition={{ duration: 1.6, repeat: playing ? Infinity : 0 }}
    >
      <path d="M9 18V6l10-2v10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="7" cy="18" r="2.4" />
      <circle cx="17" cy="16" r="2.4" />
    </motion.svg>
  );
}
function SpeakerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="M16 8a5 5 0 010 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function MutedIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="M16 9l6 6M22 9l-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
