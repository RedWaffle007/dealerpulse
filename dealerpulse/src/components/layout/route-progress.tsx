"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * A slim top loading bar shown during route transitions — the Linear/Vercel
 * pattern that replaced the old full-screen logo loader. It keeps the current
 * page visible (navigation swaps content only when ready) and just signals that
 * something is happening.
 *
 * Start is detected by wrapping history.pushState/replaceState (App Router
 * navigations, incl. filter changes) and capturing same-origin link clicks;
 * completion by the committed pathname/query changing. State is only ever set
 * from listeners, intervals, or timeouts — never synchronously in an effect body
 * (the project's `set-state-in-effect` lint rule) — and the initial render is
 * inert, so there is no hydration mismatch.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const searchStr = useSearchParams().toString();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const trickle = useRef<ReturnType<typeof setInterval> | null>(null);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstCommit = useRef(true);

  useEffect(() => {
    const stopTrickle = () => {
      if (trickle.current) {
        clearInterval(trickle.current);
        trickle.current = null;
      }
    };
    const start = () => {
      if (hide.current) {
        clearTimeout(hide.current);
        hide.current = null;
      }
      setVisible(true);
      setWidth((w) => (w > 0 && w < 90 ? w : 10));
      stopTrickle();
      // Ease toward 90% while we wait, so the bar feels alive but never finishes
      // on its own — the commit effect takes it to 100%.
      trickle.current = setInterval(() => {
        setWidth((w) => (w < 90 ? w + (90 - w) * 0.1 : w));
      }, 180);
    };

    const origPush = history.pushState.bind(history);
    const origReplace = history.replaceState.bind(history);
    history.pushState = ((...args: Parameters<typeof history.pushState>) => {
      start();
      return origPush(...args);
    }) as typeof history.pushState;
    history.replaceState = ((
      ...args: Parameters<typeof history.replaceState>
    ) => {
      start();
      return origReplace(...args);
    }) as typeof history.replaceState;

    const onClick = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }
      const anchor = (e.target as Element | null)?.closest?.("a");
      if (!anchor) return;
      const target = anchor.getAttribute("target");
      if (anchor.hasAttribute("download") || (target && target !== "_self")) {
        return;
      }
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      try {
        const url = new URL(anchor.href, location.href);
        if (
          url.origin === location.origin &&
          (url.pathname !== location.pathname || url.search !== location.search)
        ) {
          start();
        }
      } catch {
        /* not a navigable URL */
      }
    };
    document.addEventListener("click", onClick, true);

    return () => {
      history.pushState = origPush;
      history.replaceState = origReplace;
      document.removeEventListener("click", onClick, true);
      stopTrickle();
      if (hide.current) clearTimeout(hide.current);
    };
  }, []);

  // Finish when the route commits (pathname or query changed).
  useEffect(() => {
    if (firstCommit.current) {
      firstCommit.current = false;
      return;
    }
    if (trickle.current) {
      clearInterval(trickle.current);
      trickle.current = null;
    }
    const fill = setTimeout(() => setWidth(100), 0);
    hide.current = setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 260);
    return () => clearTimeout(fill);
  }, [pathname, searchStr]);

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        insetInline: 0,
        top: 0,
        height: 2,
        zIndex: 60,
        pointerEvents: "none",
        opacity: visible ? 1 : 0,
        transition: "opacity 200ms ease 120ms",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${width}%`,
          background: "var(--brand)",
          boxShadow: "0 0 8px var(--brand)",
          transition: "width 180ms ease",
        }}
      />
    </div>
  );
}
