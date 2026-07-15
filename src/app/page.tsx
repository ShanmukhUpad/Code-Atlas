import { GradientBackground } from "@/components/aero/GradientBackground";
import { ImportPanel } from "@/components/upload/ImportPanel";

export default function Home() {
  return (
    <GradientBackground>
      {/* Scrollable foreground so a tall panel is never clipped on short screens. */}
      <main className="aero-scroll h-full overflow-y-auto">
        <div className="flex min-h-full flex-col items-center justify-center gap-5 px-6 py-8">
          <header className="flex flex-col items-center text-center">
            <p className="mb-2 font-display text-[12px] font-semibold uppercase tracking-[0.45em] text-white/85 text-shadow-aero">
              Understand any codebase
            </p>
            <Wordmark />
            <p className="mx-auto mt-3 max-w-lg font-display text-base font-medium text-white/95 text-shadow-aero">
              Understand an unfamiliar codebase as a connected system rather
              than a pile of files. See how everything fits together, and how a
              change in one place ripples through the rest.
            </p>
          </header>

          <ImportPanel />

          <p className="font-display text-xs font-medium text-white/75">
            Everything is read locally or from public GitHub. Nothing is stored.
          </p>
        </div>
      </main>
    </GradientBackground>
  );
}

/** Glossy aqua-chrome logo with a bevel, top gloss, and a mirrored reflection. */
function Wordmark() {
  const word = "Codebase Mapper";
  return (
    <div className="relative select-none leading-none">
      <h1
        className="font-display text-6xl font-bold tracking-tight md:text-7xl"
        style={{
          background:
            "linear-gradient(180deg, #ffffff 0%, #eafaff 34%, #b8ecff 50%, #7fd6ff 51%, #d6f6ff 74%, #ffffff 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          WebkitTextStroke: "1.5px rgba(255,255,255,0.9)",
          filter:
            "drop-shadow(0 2px 0 rgba(21,96,212,0.55)) drop-shadow(0 6px 14px rgba(4,20,60,0.5))",
        }}
      >
        {word}
      </h1>
      {/* mirrored reflection */}
      <h1
        aria-hidden
        className="font-display absolute left-0 top-full -mt-2 text-6xl font-bold tracking-tight md:text-7xl"
        style={{
          transform: "scaleY(-1)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.5), transparent 55%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          opacity: 0.35,
          maskImage: "linear-gradient(180deg, black, transparent 45%)",
          WebkitMaskImage: "linear-gradient(180deg, black, transparent 45%)",
        }}
      >
        {word}
      </h1>
    </div>
  );
}
