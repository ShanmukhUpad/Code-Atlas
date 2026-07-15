"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useReactFlow, type Node } from "@xyflow/react";
import type { AtlasNodeData } from "@/types";
import { useAtlas } from "@/store";

/** Screen-anchored hover tooltip (doesn't scale with zoom). */
export function NodeTooltip({ nodes }: { nodes: Node<AtlasNodeData>[] }) {
  const { flowToScreenPosition } = useReactFlow();
  const hoveredPath = useAtlas((s) => s.hoveredPath);
  const summary = useAtlas((s) =>
    hoveredPath ? s.explanations[hoveredPath]?.summary : undefined,
  );

  const node = hoveredPath
    ? nodes.find((n) => n.data.path === hoveredPath)
    : undefined;
  if (!node) return null;

  const width =
    (node.width as number) ?? (node.data.kind === "folder" ? 176 : 152);
  const top = flowToScreenPosition({
    x: node.position.x + width / 2,
    y: node.position.y,
  });

  return (
    <AnimatePresence>
      <motion.div
        key={hoveredPath}
        initial={{ opacity: 0, y: 6, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.96 }}
        transition={{ duration: 0.15 }}
        className="glass gloss pointer-events-none fixed z-40 w-72 -translate-x-1/2 -translate-y-full rounded-2xl px-4 py-3"
        style={{ left: top.x, top: top.y - 14 }}
      >
        <div className="relative z-10">
          <div className="mb-1 truncate font-mono text-[11px] font-semibold text-ink-soft">
            {node.data.kind === "folder" ? "📁 " : ""}
            {node.data.label}
          </div>
          <p className="text-[13px] leading-snug text-ink">
            {summary ?? "Reading…"}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
