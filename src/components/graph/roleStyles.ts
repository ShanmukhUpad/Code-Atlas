import type { NodeRole } from "@/types";

export interface RoleStyle {
  label: string;
  /** two-stop gradient for the glossy node body */
  from: string;
  to: string;
  /** glow color used on hover/select */
  glow: string;
}

export const ROLE_STYLES: Record<NodeRole, RoleStyle> = {
  entry: { label: "Entry point", from: "#ffe58a", to: "#ffb43a", glow: "#ffd24a" },
  hub: { label: "Core module", from: "#ffb3d4", to: "#ff5f9e", glow: "#ff6fae" },
  orchestrator: {
    label: "Coordinator",
    from: "#c9b8ff",
    to: "#8a63ff",
    glow: "#9b7bff",
  },
  component: { label: "Component", from: "#a9d8ff", to: "#3a92ff", glow: "#4aa8ff" },
  util: { label: "Helper", from: "#b6f5c8", to: "#37d07a", glow: "#5fe08a" },
  config: { label: "Config", from: "#e3e6ee", to: "#aab0c2", glow: "#c3c9d8" },
  file: { label: "File", from: "#d7f4ff", to: "#7fd8ec", glow: "#7ff0e6" },
};

/** A tiny glyph per file kind, used inside nodes. */
export function extGlyph(ext: string): string {
  switch (ext.toLowerCase()) {
    case ".tsx":
    case ".jsx":
      return "⬡"; // component-ish
    case ".ts":
      return "TS";
    case ".js":
    case ".mjs":
    case ".cjs":
      return "JS";
    case ".py":
      return "PY";
    default:
      return "•";
  }
}
