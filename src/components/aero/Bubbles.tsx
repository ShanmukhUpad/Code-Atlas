"use client";

import { useEffect, useState } from "react";

interface Bubble {
  left: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
}

/** Rising Frutiger-Aero bubbles. Rendered client-side to avoid SSR mismatch. */
export function Bubbles({ count = 18 }: { count?: number }) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  useEffect(() => {
    // One-time client-only randomization — deliberately after mount to avoid an
    // SSR/client hydration mismatch from Math.random().
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBubbles(
      Array.from({ length: count }, () => ({
        left: Math.random() * 100,
        size: 8 + Math.random() * 46,
        delay: Math.random() * 14,
        duration: 10 + Math.random() * 12,
        opacity: 0.2 + Math.random() * 0.4,
      })),
    );
  }, [count]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {bubbles.map((b, i) => (
        <span
          key={i}
          className="animate-bubble absolute bottom-[-10vh] rounded-full"
          style={{
            left: `${b.left}%`,
            width: b.size,
            height: b.size,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.duration}s`,
            background:
              "radial-gradient(circle at 34% 30%, rgba(255,255,255,0.55), rgba(255,255,255,0.06) 34%, transparent 46%), radial-gradient(circle at 68% 74%, rgba(140,240,255,0.35), transparent 55%)",
            border: "1px solid rgba(255,255,255,0.55)",
            boxShadow:
              "inset 0 0 14px rgba(255,255,255,0.45), 0 4px 14px rgba(6,42,107,0.18)",
            opacity: b.opacity,
          }}
        >
          {/* crisp specular glint */}
          <span
            className="absolute rounded-full bg-white"
            style={{
              left: "26%",
              top: "18%",
              width: "22%",
              height: "16%",
              filter: "blur(0.5px)",
              opacity: 0.9,
            }}
          />
        </span>
      ))}
    </div>
  );
}
