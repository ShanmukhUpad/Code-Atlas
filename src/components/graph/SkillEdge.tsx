"use client";

import { memo } from "react";
import { getBezierPath, type EdgeProps } from "@xyflow/react";
import { useAtlas } from "@/store";

function SkillEdgeBase({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  source,
  target,
  data,
}: EdgeProps) {
  const variant = (data?.variant as "branch" | "dep") ?? "dep";
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature: variant === "branch" ? 0.5 : 0.35,
  });

  // Highlight/dim is driven only by a focused file, not folders.
  const active = useAtlas((s) => {
    const focus = s.hoveredPath ?? s.selectedPath;
    if (!focus || !s.filesByPath[focus]) return false;
    return focus === source || focus === target;
  });
  const dim = useAtlas((s) => {
    const focus = s.hoveredPath ?? s.selectedPath;
    if (!focus || !s.filesByPath[focus]) return false;
    return focus !== source && focus !== target;
  });

  const gradId = `edge-grad-${id}`;

  if (variant === "branch") {
    // Containment branch: calm, bright skeleton line of the skill tree.
    return (
      <g style={{ opacity: dim ? 0.25 : 1, transition: "opacity 0.2s" }}>
        <path
          d={path}
          fill="none"
          stroke="#eafcff"
          strokeWidth={active ? 7 : 5}
          strokeOpacity={0.4}
          strokeLinecap="round"
          style={{ filter: "blur(2.5px)" }}
        />
        <path
          d={path}
          fill="none"
          stroke={active ? "#ffffff" : "#bfeeff"}
          strokeWidth={active ? 3 : 2.2}
          strokeLinecap="round"
        />
        <circle cx={targetX} cy={targetY} r={2.4} fill="#ffffff" />
      </g>
    );
  }

  // Dependency cross-link: animated energy conduit.
  return (
    <g style={{ opacity: dim ? 0.14 : 1, transition: "opacity 0.2s" }}>
      <defs>
        <linearGradient id={gradId} gradientUnits="userSpaceOnUse" x1={sourceX} y1={sourceY} x2={targetX} y2={targetY}>
          <stop offset="0%" stopColor="#7ff0e6" />
          <stop offset="100%" stopColor={active ? "#ffffff" : "#4aa8ff"} />
        </linearGradient>
      </defs>
      <path
        d={path}
        fill="none"
        stroke={active ? "#bff6ff" : "#9fe8ff"}
        strokeWidth={active ? 7 : 4}
        strokeOpacity={active ? 0.5 : 0.22}
        strokeLinecap="round"
        style={{ filter: "blur(3px)" }}
      />
      <path
        d={path}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth={active ? 2.6 : 1.6}
        strokeLinecap="round"
        strokeDasharray="1 7"
      />
      <path
        d={path}
        fill="none"
        stroke="#ffffff"
        strokeWidth={active ? 2.2 : 1.4}
        strokeLinecap="round"
        strokeDasharray="2 14"
        className="animate-flow"
        style={{ opacity: active ? 0.95 : 0.45 }}
      />
      <circle
        cx={labelX}
        cy={labelY}
        r={active ? 3.6 : 2.2}
        fill="#ffffff"
        stroke="#4aa8ff"
        strokeWidth={1}
        style={{ filter: active ? "drop-shadow(0 0 6px #7ff0e6)" : "none" }}
      />
    </g>
  );
}

export const SkillEdge = memo(SkillEdgeBase);
