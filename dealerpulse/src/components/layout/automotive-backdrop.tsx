/** Decorative, shared by every route; never competes with opaque content cards. */
export function AutomotiveBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_10%_15%,color-mix(in_oklch,var(--brand)_8%,transparent),transparent_55%),radial-gradient(ellipse_at_90%_80%,color-mix(in_oklch,var(--brand-secondary)_7%,transparent),transparent_55%)]" />
      <svg viewBox="0 0 1000 480" fill="none" className="absolute -right-24 bottom-0 w-[min(65rem,140vw)] text-brand opacity-[0.07] dark:opacity-[0.10]" stroke="currentColor" strokeWidth="2">
        <path d="M80 330h45l25-55 135-25 95-110h235l110 112 112 30 35 48v35h-66m-104 0H310m-105 0H125v-35" />
        <path d="m303 248 87-95h99v95H303Zm200 0v-95h104l96 95H503Z" />
        <circle cx="257" cy="358" r="51" /><circle cx="754" cy="358" r="51" />
        <circle cx="257" cy="358" r="25" /><circle cx="754" cy="358" r="25" />
        <path d="M330 280h36m151 0h36M145 298h52m599 5h37M30 420h890" />
        <g className="text-brand-secondary" stroke="currentColor">
          <path d="M25 188h185M65 212h135M10 236h140M420 450h420" />
        </g>
      </svg>
    </div>
  );
}
