import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Variant = "light" | "dark";

/** A frosted Frutiger-Aero glass surface with a glossy top highlight. */
export function GlassPanel({
  children,
  variant = "light",
  gloss = true,
  className = "",
  ...rest
}: {
  children: ReactNode;
  variant?: Variant;
  gloss?: boolean;
} & ComponentPropsWithoutRef<"div">) {
  const base = variant === "dark" ? "glass-dark" : "glass";
  return (
    <div
      className={`relative overflow-hidden ${base} ${gloss ? "gloss" : ""} ${className}`}
      {...rest}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}
