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

// --- Sound: decode once, up front, so the strike is instant when it fires ------
//
// The old approach (`new Audio(src).play()` at mount) was unreliable in two ways:
// the 300KB WAV was fetched+decoded only at play time, so the strike lagged the
// reveal by however long that took; and a rejected autoplay retried the *same*
// already-late element. Here we decode a tiny MP3 into a Web Audio buffer as soon
// as the splash mounts, then start a fresh buffer source at a precise moment —
// zero fetch/decode latency at fire time. Autoplay policy is the only remaining
// gate, and we unlock it on the first gesture (see armTick).
let audioCtx: AudioContext | null = null;
let bufferPromise: Promise<AudioBuffer> | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  return audioCtx;
}

function loadBuffer(ctx: AudioContext): Promise<AudioBuffer> {
  if (!bufferPromise) {
    bufferPromise = fetch(TICK_SRC)
      .then((r) => r.arrayBuffer())
      .then((buf) => ctx.decodeAudioData(buf));
  }
  return bufferPromise;
}

/** Kick off fetch+decode immediately; safe to call before any playback. */
function warmTick() {
  try {
    const ctx = getCtx();
    if (ctx) void loadBuffer(ctx);
  } catch {
    /* sound is a nicety — never let it disturb the reveal */
  }
}

/**
 * Ring the strike once. If the context is already unlocked, plays immediately;
 * otherwise resumes it (a prior navigation gesture often counts) and, failing
 * that, arms one-shot listeners so it still rings on the first interaction.
 */
function ringTick() {
  const ctx = getCtx();
  if (!ctx) return;
  let fired = false;
  const play = () => {
    if (fired) return;
    fired = true;
    void loadBuffer(ctx).then((buffer) => {
      try {
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.value = 0.7;
        src.connect(gain).connect(ctx.destination);
        src.start();
      } catch {
        /* ignore */
      }
    });
  };

  const cleanup = () => {
    window.removeEventListener("pointerdown", onGesture);
    window.removeEventListener("keydown", onGesture);
    window.removeEventListener("touchstart", onGesture);
  };
  const onGesture = () => {
    void ctx.resume().finally(play);
    cleanup();
  };

  const attempt = ctx.state === "suspended" ? ctx.resume() : Promise.resolve();
  attempt
    .then(() => {
      if (ctx.state === "running") {
        play();
      } else {
        arm();
      }
    })
    .catch(arm);

  function arm() {
    window.addEventListener("pointerdown", onGesture, { once: true });
    window.addEventListener("keydown", onGesture, { once: true });
    window.addEventListener("touchstart", onGesture, { once: true });
    setTimeout(cleanup, 10000);
  }
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
