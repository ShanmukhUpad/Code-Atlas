"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { motion } from "framer-motion";
import type { FileNodeData } from "@/types";
import { useAtlas } from "@/store";
import { ROLE_STYLES, extGlyph } from "./roleStyles";

type FileFlowNode = Node<FileNodeData, "file">;

const HEX = "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)";

function FileNodeBase({ data }: NodeProps<FileFlowNode>) {
  const style = ROLE_STYLES[data.role];
  const path = data.path;

  const hovered = useAtlas((s) => s.hoveredPath === path);
  const selected = useAtlas((s) => s.selectedPath === path);
  // Dim ("locked") when another node is focused and this one isn't connected.
  const dim = useAtlas((s) => {
    const focus = s.hoveredPath ?? s.selectedPath;
    if (!focus || focus === path) return false;
    // Only a focused *file* drives the connected-subtree highlight.
    if (!s.filesByPath[focus]) return false;
    const f = s.filesByPath[focus];
    const self = s.filesByPath[path];
    const related =
      (f && (f.dependencies.includes(path) || f.dependents.includes(path))) ||
      (self &&
        (self.dependencies.includes(focus) || self.dependents.includes(focus)));
    return !related;
  });

  const active = hovered || selected;

  return (
    <div
      className="flex flex-col items-center"
      style={{ width: 152, height: 104 }}
    >
      <Handle type="target" position={Position.Top} />

      {/* skill gem */}
      <motion.div
        initial={false}
        animate={{
          scale: active ? 1.14 : 1,
          opacity: dim ? 0.32 : 1,
          y: active ? -2 : 0,
        }}
        transition={{ type: "spring", stiffness: 320, damping: 22 }}
        className="relative"
        style={{ width: 62, height: 62 }}
      >
        {/* glow aura */}
        {active && (
          <div
            className="absolute -inset-2 rounded-full"
            style={{
              background: `radial-gradient(circle, ${style.glow}cc, transparent 68%)`,
              filter: "blur(3px)",
            }}
          />
        )}
        {/* chrome rim (slightly larger hex behind) */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: HEX,
            background:
              "linear-gradient(160deg, #ffffff, #cfe2f5 40%, #7d97b8 70%, #ffffff)",
          }}
        />
        {/* gem body */}
        <div
          className="gem-sheen absolute inset-[3px]"
          style={{
            clipPath: HEX,
            background: `linear-gradient(160deg, ${style.from} 0%, ${style.to} 100%)`,
            boxShadow: active
              ? `inset 0 2px 6px rgba(255,255,255,0.9), inset 0 -8px 12px rgba(6,42,107,0.35)`
              : `inset 0 2px 5px rgba(255,255,255,0.8), inset 0 -6px 10px rgba(6,42,107,0.3)`,
          }}
        />
        {/* glyph */}
        <div className="absolute inset-0 grid place-items-center">
          <span
            className="font-display text-[13px] font-bold text-ink drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]"
            style={{ textShadow: "0 1px 1px rgba(255,255,255,0.7)" }}
          >
            {extGlyph(data.ext)}
          </span>
        </div>
      </motion.div>

      {/* label plate */}
      <motion.div
        initial={false}
        animate={{ opacity: dim ? 0.3 : 1, y: active ? -1 : 0 }}
        className="candy relative mt-1.5 max-w-[148px] overflow-hidden rounded-lg border border-white/80 px-2 py-1"
        style={{
          background: selected
            ? "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(214,246,255,0.8))"
            : "linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,255,255,0.5))",
          boxShadow: active
            ? `0 4px 12px rgba(6,42,107,0.3), 0 0 0 1.5px ${style.glow}`
            : "0 3px 8px rgba(6,42,107,0.22)",
        }}
      >
        <div className="relative z-10 truncate text-center font-display text-[11px] font-semibold leading-tight text-ink">
          {data.label}
        </div>
        <div className="relative z-10 flex items-center justify-center gap-1 text-[8.5px] font-semibold uppercase tracking-wide text-ink/55">
          <span>{style.label}</span>
          {data.fanIn > 0 && <span>· ▲{data.fanIn}</span>}
          {data.fanOut > 0 && <span>· ▼{data.fanOut}</span>}
        </div>
      </motion.div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export const FileNode = memo(FileNodeBase);
