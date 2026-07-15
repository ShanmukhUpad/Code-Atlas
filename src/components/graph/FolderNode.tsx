"use client";

import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import type { FolderNodeData } from "@/types";
import { useAtlas } from "@/store";

type FolderFlowNode = Node<FolderNodeData, "folder">;

function FolderNodeBase({ data }: NodeProps<FolderFlowNode>) {
  const path = data.path;
  const hovered = useAtlas((s) => s.hoveredPath === path);
  const selected = useAtlas((s) => s.selectedPath === path);
  const active = hovered || selected;
  const collapsedWithKids = !data.expanded && data.hasChildren;

  return (
    <div className="flex flex-col items-center" style={{ width: 176, height: 92 }}>
      <Handle type="target" position={Position.Top} />

      <motion.div
        initial={false}
        animate={{ scale: active ? 1.1 : 1, y: active ? -2 : 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 22 }}
        className="relative"
        style={{ width: 58, height: 58 }}
      >
        {/* aura */}
        {(active || collapsedWithKids) && (
          <motion.div
            className="absolute -inset-2 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(127,240,230,0.85), transparent 68%)",
              filter: "blur(3px)",
            }}
            animate={
              collapsedWithKids && !active
                ? { opacity: [0.35, 0.7, 0.35], scale: [1, 1.08, 1] }
                : { opacity: 0.9, scale: 1 }
            }
            transition={
              collapsedWithKids && !active
                ? { duration: 2.2, repeat: Infinity }
                : { duration: 0.2 }
            }
          />
        )}
        {/* chrome rim */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "linear-gradient(160deg, #ffffff, #cfe6f7 42%, #7d9bbd 72%, #ffffff)",
          }}
        />
        {/* glossy orb body */}
        <div
          className="gem-sheen absolute inset-[3px] grid place-items-center rounded-full"
          style={{
            background:
              "linear-gradient(160deg, #d8f8ff 0%, #4fd6ee 52%, #17a6d8 100%)",
            boxShadow:
              "inset 0 3px 6px rgba(255,255,255,0.9), inset 0 -8px 12px rgba(6,42,107,0.4)",
          }}
        >
          <span className="text-lg drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]">
            📁
          </span>
        </div>
        {/* expand / collapse badge */}
        {data.hasChildren && (
          <div
            className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border border-white/90 font-display text-[13px] font-bold text-ink shadow-[0_2px_5px_rgba(6,42,107,0.4)]"
            style={{
              background: data.expanded
                ? "linear-gradient(180deg,#ffd88a,#ffb43a)"
                : "linear-gradient(180deg,#b6f5c8,#37d07a)",
            }}
          >
            {data.expanded ? "−" : "+"}
          </div>
        )}
      </motion.div>

      {/* label plate */}
      <motion.div
        initial={false}
        animate={{ y: active ? -1 : 0 }}
        className="candy relative mt-1.5 max-w-[172px] overflow-hidden rounded-lg border border-white/80 px-2.5 py-1"
        style={{
          background: selected
            ? "linear-gradient(180deg, rgba(255,255,255,0.97), rgba(200,244,255,0.85))"
            : "linear-gradient(180deg, rgba(255,255,255,0.88), rgba(214,246,255,0.6))",
          boxShadow: active
            ? "0 4px 12px rgba(6,42,107,0.3), 0 0 0 1.5px #33d6f2"
            : "0 3px 8px rgba(6,42,107,0.22)",
        }}
      >
        <div className="relative z-10 truncate text-center font-display text-[12px] font-bold leading-tight text-ink">
          {data.label}
        </div>
        <div className="relative z-10 text-center font-display text-[9px] font-semibold uppercase tracking-wide text-ink/55">
          {data.fileCount} file{data.fileCount === 1 ? "" : "s"}
          {data.hasChildren && (
            <span className="text-ink/45">
              {" · "}
              {data.expanded ? "click to collapse" : "click to open"}
            </span>
          )}
        </div>
      </motion.div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export const FolderNode = memo(FolderNodeBase);
