"use client";

import { useState } from "react";
import { GlassButton } from "@/components/aero/GlassButton";
import { playSfx } from "@/lib/audio/sfx";

export function GithubInput({
  onSubmit,
  busy,
}: {
  onSubmit: (url: string) => void;
  busy: boolean;
}) {
  const [url, setUrl] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy && url.trim()) onSubmit(url.trim());
      }}
      className="flex items-center gap-2"
    >
      <div className="glass gloss relative flex-1 overflow-hidden rounded-full px-4 py-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onFocus={() => playSfx("hover")}
          disabled={busy}
          placeholder="https://github.com/owner/repo"
          className="relative z-10 w-full bg-transparent text-sm text-ink placeholder:text-ink-soft/70 outline-none"
        />
      </div>
      <GlassButton type="submit" tone="green" disabled={busy || !url.trim()}>
        Import
      </GlassButton>
    </form>
  );
}
