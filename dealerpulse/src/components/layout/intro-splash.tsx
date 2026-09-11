"use client";

import { useEffect, useState } from "react";

/**
 * Cold-start reveal — a faithful web port of the reference "MJQ SOFTWARE"
 * Supercell-style splash: a pure-black surface out of which a heavy condensed
 * wordmark (Anton) blooms with a soft baked glow over two brand bars, a
 * pendulum-strike sound ringing once as it mounts. Here the wordmark is
 * DEALERPULSE with the tagline beneath.
 *
 * Timing matches the original: ~3s intro (emerge + hold) then a ~0.55s fade into
 * the app. Shown once per tab session (like the original's cold-start-only
 * guard) — a fresh or reopened tab greets; a same-window refresh does not (the
 * inline script in layout stamps `data-intro-seen`, and the `[data-intro-seen]
 * .dp-intro` rule hides this before paint).
 */
const INTRO_MS = 3000;
const OUTRO_MS = 550;
// The wordmark blooms in at ~520ms (see dp-splash-in delay below). The bell has a
// sharp attack at t=0, so ringing it a hair before the bloom lands the strike and
// the visual together — the "feel" the reference has.
const RING_AT_MS = 480;
const TICK_SRC = "/tick.mp3";

// --- Sound: decode once, up front, and defeat autoplay with a gesture unlock ---
//
// Two hard facts shape this:
//  1. Browsers block audio until the page has a user activation. On a cold tab
//     there is none, so an auto-playing splash sound is gated no matter what.
//  2. A tiny pre-decoded Web Audio buffer removes all fetch/decode latency, so
//     when we *are* allowed to play, the strike is instant.
//
// So we do both: try to play the moment the splash mounts (works when the click
// that opened the app still counts as activation), and — installed at mount, not
// only during the 3s splash — a persistent set of capture-phase gesture listeners
// that resume the AudioContext and ring on the very first interaction. The strike
// therefore lands on load when the browser allows it, otherwise on the user's
// first click/key/tap. That first-gesture path is the reliable one.
let audioCtx: AudioContext | null = null;
let bufferPromise: Promise<AudioBuffer> | null = null;
let armed = false;
let wantRing = false;
let didRing = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    if (!audioCtx) audioCtx = new Ctor();
    return audioCtx;
  } catch {
    return null;
  }
}

function loadBuffer(ctx: AudioContext): Promise<AudioBuffer> {
  if (!bufferPromise) {
    bufferPromise = fetch(TICK_SRC)
      .then((r) => r.arrayBuffer())
      .then((buf) => ctx.decodeAudioData(buf));
  }
  return bufferPromise;
}

/** Start the strike once, but only when the buffer is ready and the ctx runs. */
function startSound(ctx: AudioContext) {
  if (didRing || !wantRing || ctx.state !== "running") return;
  void loadBuffer(ctx).then((buffer) => {
    if (didRing || ctx.state !== "running") return;
    try {
      didRing = true;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = 0.7;
      src.connect(gain).connect(ctx.destination);
      src.start();
    } catch {
      /* never let sound failure disturb the reveal */
    }
  });
}

/**
 * Install capture-phase listeners once. The first real interaction resumes the
 * (otherwise suspended) context and rings — this is what makes the sound
 * reliable under autoplay policy. Listeners clear themselves once it has rung.
 */
function armGestures() {
  if (armed || typeof window === "undefined") return;
  armed = true;
  const events = ["pointerdown", "mousedown", "keydown", "touchstart", "click"];
  const handler = () => {
    const ctx = getCtx();
    if (!ctx) return;
    void ctx.resume().then(() => startSound(ctx));
    if (didRing) remove();
  };
  const remove = () =>
    events.forEach((e) => window.removeEventListener(e, handler, true));
  events.forEach((e) => window.addEventListener(e, handler, true));
  window.setTimeout(remove, 60_000); // guard: don't leak listeners forever
}

/** Preload + decode and arm the gesture unlock, as early as the splash mounts. */
function warmTick() {
  const ctx = getCtx();
  if (ctx) void loadBuffer(ctx);
  armGestures();
}

/** Ask to ring: play now if we already have activation, else the gesture rings. */
function ringTick() {
  wantRing = true;
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "running") startSound(ctx);
  else void ctx.resume().then(() => startSound(ctx));
}

export function IntroSplash() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Same-tab refresh: pre-paint script stamped data-intro-seen and CSS hides
    // this; nothing to do (no synchronous state change).
    if (document.documentElement.hasAttribute("data-intro-seen")) return;
    // Start decoding right away so the buffer is ready well before the strike,
    // then fire it in sync with the wordmark bloom.
    warmTick();
    const ring = setTimeout(ringTick, RING_AT_MS);
    const done = setTimeout(() => setShow(false), INTRO_MS + OUTRO_MS + 120);
    return () => {
      clearTimeout(ring);
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
            fontFamily: "var(--font-anton), system-ui, sans-serif",
            fontSize: "clamp(2.25rem, 11vw, 4.25rem)",
            letterSpacing: "0.06em",
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
            fontFamily: "var(--font-anton), system-ui, sans-serif",
            fontSize: "clamp(0.7rem, 2.4vw, 0.95rem)",
            letterSpacing: "0.22em",
          }}
        >
          FEEL YOUR DATA
        </div>
      </div>
    </div>
  );
}
