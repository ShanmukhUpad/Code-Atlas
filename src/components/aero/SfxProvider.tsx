"use client";

import { useEffect } from "react";
import { preloadSfx, unlockAudio } from "@/lib/audio/sfx";

/** Unlocks + preloads audio on the first user gesture (browser autoplay policy). */
export function SfxProvider() {
  useEffect(() => {
    const handler = () => {
      unlockAudio();
      preloadSfx();
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
    };
    window.addEventListener("pointerdown", handler);
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
    };
  }, []);
  return null;
}
