"use client";

import { useAtlas } from "@/store";

// Default mapping onto the Wii U SFX copied into /public/sounds.
// Picks were chosen by WAV duration profile (can't audition here) — the full
// numbered set lives in /sounds/wiiu, so re-tune by ear by re-copying a file.
//   hover   ← wiiu/00265  (22ms cursor tick — softest, fires rapidly)
//   click   ← wiiu/00273  (142ms select/confirm — snappy, distinct from hover)
//   back    ← wiiu/00275  (82ms cancel — distinct from the hover tick)
//   open    ← wiiu/00280  (297ms open flourish)
//   select  ← wiiu/00252  (plays when a file/folder node is clicked)
//   success ← wiiu/00244  (680ms arrival jingle, plays on entering the map)
export const SFX = {
  hover: "/sounds/hover.wav",
  click: "/sounds/click.wav",
  open: "/sounds/open.wav",
  back: "/sounds/back.wav",
  select: "/sounds/select.wav",
  success: "/sounds/success.wav",
} as const;

export type SfxName = keyof typeof SFX;

// Per-sound volume so the longer jingle doesn't overpower the UI ticks.
const VOLUME: Record<SfxName, number> = {
  hover: 0.32,
  click: 0.5,
  back: 0.45,
  open: 0.5,
  select: 0.5,
  success: 0.4,
};

const POOL_SIZE = 4;
const HOVER_THROTTLE_MS = 55;

interface Pool {
  els: HTMLAudioElement[];
  idx: number;
}

const pools: Partial<Record<SfxName, Pool>> = {};
let lastHover = 0;
let unlocked = false;

function getPool(name: SfxName): Pool | null {
  if (typeof window === "undefined") return null;
  let pool = pools[name];
  if (!pool) {
    const els = Array.from({ length: POOL_SIZE }, () => {
      const a = new Audio(SFX[name]);
      a.preload = "auto";
      a.volume = VOLUME[name];
      return a;
    });
    pool = { els, idx: 0 };
    pools[name] = pool;
  }
  return pool;
}

/** Preload the pools so the first hover/click is instant. */
export function preloadSfx() {
  (Object.keys(SFX) as SfxName[]).forEach(getPool);
}

/** Browsers block audio until a user gesture — call once on first interaction. */
export function unlockAudio() {
  if (unlocked || typeof window === "undefined") return;
  unlocked = true;
  preloadSfx();
}

export function playSfx(name: SfxName) {
  if (typeof window === "undefined") return;
  if (useAtlas.getState().muted) return;
  if (name === "hover") {
    const now = performance.now();
    if (now - lastHover < HOVER_THROTTLE_MS) return;
    lastHover = now;
  }
  const pool = getPool(name);
  if (!pool) return;
  const el = pool.els[pool.idx];
  pool.idx = (pool.idx + 1) % pool.els.length;
  try {
    el.currentTime = 0;
    void el.play().catch(() => {});
  } catch {
    /* ignore autoplay rejections */
  }
}
