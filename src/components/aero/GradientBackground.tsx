import type { ReactNode } from "react";
import { Bubbles } from "./Bubbles";

/**
 * Full-viewport Frutiger Aero scene: saturated blue sky diving into a glossy
 * aqua-green sea, with light caustics, a bright horizon band, chrome mirror
 * spheres, a wet-floor reflection, rising bubbles, film grain, and a vignette.
 */
export function GradientBackground({
  children,
  bubbles = true,
}: {
  children?: ReactNode;
  bubbles?: boolean;
}) {
  return (
    <div className="grain relative h-dvh w-full overflow-hidden">
      {/* base sky → sea → grass */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(178deg, #041f52 0%, #0b3fa0 26%, #1f78e0 46%, #2fc6ec 64%, #63e6d8 79%, #66d98a 100%)",
        }}
      />
      {/* light caustics / god-rays */}
      <div
        className="absolute inset-0 opacity-70 mix-blend-screen"
        style={{
          background:
            "radial-gradient(48% 30% at 80% 4%, rgba(255,255,255,0.7), transparent 62%), radial-gradient(40% 34% at 12% 22%, rgba(140,240,255,0.4), transparent 66%), radial-gradient(70% 50% at 60% -12%, rgba(200,255,245,0.22), transparent 70%)",
        }}
      />
      {/* bright specular horizon band (waterline) */}
      <div
        className="absolute inset-x-0"
        style={{
          top: "62%",
          height: "3px",
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.85) 45%, rgba(255,255,255,0.95) 55%, transparent)",
          filter: "blur(1px)",
          boxShadow: "0 0 24px 6px rgba(255,255,255,0.45)",
        }}
      />

      {/* chrome mirror spheres (Frutiger Aero signature) */}
      <ChromeSphere className="left-[6%] top-[10%] h-28 w-28" />
      <ChromeSphere className="right-[10%] top-[24%] h-16 w-16" />
      <ChromeSphere className="left-[42%] top-[6%] h-10 w-10" />

      {/* wet-floor reflection */}
      <div
        className="absolute inset-x-0 bottom-0 h-[34%]"
        style={{
          background:
            "linear-gradient(180deg, transparent, rgba(255,255,255,0.10) 30%, rgba(255,255,255,0.32))",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-[22%] opacity-60 mix-blend-screen"
        style={{
          background:
            "repeating-linear-gradient(92deg, transparent 0 60px, rgba(255,255,255,0.22) 60px 61px)",
          maskImage: "linear-gradient(180deg, transparent, black)",
          WebkitMaskImage: "linear-gradient(180deg, transparent, black)",
        }}
      />

      {bubbles && <Bubbles />}

      {/* vignette for depth */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 40%, transparent 55%, rgba(4,20,60,0.35))",
        }}
      />

      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}

/** A glossy chrome ball that mirrors sky + horizon, like the reference rooms. */
function ChromeSphere({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute rounded-full ${className}`}
      style={{
        background:
          "radial-gradient(circle at 34% 26%, #ffffff 0%, #cfeeff 12%, #7fb6e6 34%, #234e8c 60%, #0a2c66 78%, #6fe0a0 92%)",
        boxShadow:
          "inset -6px -8px 18px rgba(0,0,0,0.35), inset 6px 8px 16px rgba(255,255,255,0.6), 0 14px 30px rgba(4,20,60,0.4)",
      }}
    >
      <span
        className="absolute rounded-full"
        style={{
          left: "22%",
          top: "14%",
          width: "26%",
          height: "20%",
          background:
            "radial-gradient(circle, rgba(255,255,255,0.95), transparent 70%)",
          filter: "blur(1px)",
        }}
      />
    </div>
  );
}
