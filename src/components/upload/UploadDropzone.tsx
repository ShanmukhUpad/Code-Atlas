"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { playSfx } from "@/lib/audio/sfx";
import {
  openDirectoryPicker,
  pickedFromDataTransfer,
  pickedFromDirectoryHandle,
  pickedFromInput,
  supportsDirectoryPicker,
  type Picked,
} from "@/lib/input/read";

export function UploadDropzone({
  onPicked,
  onScanStart,
  onScanProgress,
  busy,
}: {
  onPicked: (picked: Picked[], rootName?: string) => void;
  onScanStart: () => void;
  onScanProgress: (found: number) => void;
  busy: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // webkitdirectory isn't a standard React attribute — set it imperatively.
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.setAttribute("webkitdirectory", "");
      inputRef.current.setAttribute("directory", "");
    }
  }, []);

  async function handleClick() {
    if (busy) return;
    playSfx("click");
    // Prefer the File System Access API: we can prune node_modules/.git before
    // descending, and stream a live "scanning" count instead of freezing.
    if (supportsDirectoryPicker()) {
      let handle;
      try {
        handle = await openDirectoryPicker();
      } catch {
        return; // user cancelled the picker
      }
      onScanStart();
      try {
        const picked = await pickedFromDirectoryHandle(handle, onScanProgress);
        onPicked(picked, handle.name);
      } catch {
        onPicked([], handle.name);
      }
      return;
    }
    inputRef.current?.click();
  }

  return (
    <motion.div
      whileHover={{ scale: busy ? 1 : 1.01 }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!busy) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={async (e) => {
        e.preventDefault();
        setDragOver(false);
        if (busy) return;
        playSfx("click");
        onScanStart();
        const picked = await pickedFromDataTransfer(
          e.dataTransfer.items,
          onScanProgress,
        );
        onPicked(picked);
      }}
      onClick={handleClick}
      onMouseEnter={() => playSfx("hover")}
      className={`relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed px-8 py-10 text-center transition-colors ${
        dragOver ? "border-white ring-glow" : "border-white/60"
      } ${busy ? "pointer-events-none opacity-70" : ""}`}
      style={{
        background:
          "linear-gradient(180deg, rgba(90,180,220,0.28), rgba(40,120,180,0.34))",
        boxShadow:
          "inset 0 3px 10px rgba(4,30,70,0.4), inset 0 -2px 0 rgba(255,255,255,0.35), 0 1px 0 rgba(255,255,255,0.5)",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            onScanStart();
            onPicked(pickedFromInput(e.target.files));
          }
        }}
      />
      <FolderIcon />
      <div className="relative z-10">
        <p className="font-display text-base font-semibold text-white drop-shadow-[0_1px_3px_rgba(4,30,70,0.6)]">
          Drop a project folder here
        </p>
        <p className="text-sm text-white/80">
          or click to browse — read locally, JS / TS only
        </p>
      </div>
    </motion.div>
  );
}

function FolderIcon() {
  return (
    <motion.svg
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      width="52"
      height="52"
      viewBox="0 0 24 24"
      className="relative z-10 drop-shadow-[0_4px_10px_rgba(6,42,107,0.35)]"
    >
      <defs>
        <linearGradient id="folderGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b8f7c0" />
          <stop offset="1" stopColor="#33d6f2" />
        </linearGradient>
      </defs>
      <path
        d="M3 6.5A1.5 1.5 0 014.5 5h4l2 2h7A1.5 1.5 0 0119 8.5v9A1.5 1.5 0 0117.5 19h-13A1.5 1.5 0 013 17.5v-11z"
        fill="url(#folderGrad)"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="1"
      />
    </motion.svg>
  );
}
