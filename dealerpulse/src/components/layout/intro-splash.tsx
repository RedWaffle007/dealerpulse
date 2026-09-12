"use client";

import { useEffect, useState } from "react";

/**
 * Cold-start reveal — a faithful web port of the reference "MJQ SOFTWARE"
 * Supercell-style splash: a pure-black surface out of which a readable
 * wordmark blooms with a soft baked glow over two brand bars.
 * Here the wordmark is DEALERPULSE with the tagline beneath.
 *
 * Timing matches the original: ~3s intro (emerge + hold) then a ~0.55s fade into
 * the app. Shown once per tab session (like the original's cold-start-only
 * guard) — a fresh or reopened tab greets; a same-window refresh does not (the
 * inline script in layout stamps `data-intro-seen`, and the `[data-intro-seen]
 * .dp-intro` rule hides this before paint).
 */
const INTRO_MS = 3000;
const OUTRO_MS = 550;

export function IntroSplash() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Same-tab refresh: pre-paint script stamped data-intro-seen and CSS hides
    // this; nothing to do (no synchronous state change).
    if (document.documentElement.hasAttribute("data-intro-seen")) return;
    const done = setTimeout(() => setShow(false), INTRO_MS + OUTRO_MS + 120);
    return () => {
      clearTimeout(done);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className="dp-intro fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-black px-6"
      style={{
        // The whole layer holds through the 3s intro, then fades into the app.
        animation: `dp-splash-out ${OUTRO_MS}ms ease-in-out ${INTRO_MS}ms both`,
      }}
      aria-hidden
    >
      {/* The lockup: wordmark + two bars + tagline emerge together, then hold. */}
      <div
        className="flex w-fit max-w-full flex-col items-stretch"
        style={{
          animation: `dp-splash-in 1150ms cubic-bezier(0.215,0.61,0.355,1) 520ms both`,
        }}
      >
        <div
          className="text-center leading-none text-white"
          style={{
            fontFamily: "var(--font-space-grotesk), system-ui, sans-serif",
            fontWeight: 700,
            fontSize: "clamp(2.2rem, 10vw, 4rem)",
            letterSpacing: "0.025em",
            // Baked soft bloom (two layers) — matches the reference's text shadows.
            textShadow:
              "0 0 18px rgba(255,255,255,0.35), 0 0 44px rgba(255,255,255,0.2)",
          }}
        >
          DEALERPULSE
        </div>
        {/* Two brand bars spanning the wordmark width (green / burnt orange). */}
        <div className="mt-2 h-1 w-full" style={{ background: "#1B7A3D" }} />
        <div className="mt-1 h-1 w-full" style={{ background: "#C2410C" }} />
        {/* Tagline beneath the bars. */}
        <div
          className="mt-3 text-center text-white/60"
          style={{
            fontFamily: "var(--font-space-grotesk), system-ui, sans-serif",
            fontWeight: 700,
            fontSize: "clamp(0.7rem, 2.2vw, 0.95rem)",
            letterSpacing: "0.14em",
          }}
        >
          FEEL YOUR DATA
        </div>
      </div>
    </div>
  );
}
