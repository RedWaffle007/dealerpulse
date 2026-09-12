/** A quiet sketchbook of automotive marks, shared behind every route. */
export function AutomotiveBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <svg
        viewBox="0 0 1200 900"
        preserveAspectRatio="none"
        className="h-full w-full opacity-[0.13] dark:opacity-[0.17]"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <defs>
          <symbol id="dp-car" viewBox="0 0 220 120">
            <path d="M18 78h14l14-28 43-8 25-25h54l27 28 18 6 7 27h-14m-31 0H62m-30 0H18" />
            <path d="m91 42 13-18h27v18m8 0V24h28l16 18" />
            <circle cx="65" cy="80" r="17" /><circle cx="168" cy="80" r="17" />
            <circle cx="65" cy="80" r="7" /><circle cx="168" cy="80" r="7" />
            <path d="M38 57h27m83-1h31" />
          </symbol>
          <symbol id="dp-wheel" viewBox="0 0 90 90">
            <circle cx="45" cy="45" r="30" />
            <circle cx="45" cy="45" r="13" />
            <path d="M45 15v17m0 26v17M15 45h17m26 0h17M24 24l12 12m18 18 12 12M66 24 54 36M36 54 24 66" />
          </symbol>
          <symbol id="dp-gauge" viewBox="0 0 130 90">
            <path d="M15 70a50 50 0 0 1 100 0" />
            <path d="M27 60 20 52m27 7-3-13m31 13 3-13m20 14 8-8" />
            <path d="m65 68 20-25" /><circle cx="65" cy="68" r="5" />
            <path d="M47 80h36" />
          </symbol>
          <symbol id="dp-pump" viewBox="0 0 100 140">
            <path d="M22 125V25h52v100m-64 0h76M34 45h28v25H34Z" />
            <path d="M74 40h12v42q0 12-12 12M86 40l8 8" />
            <path d="M37 88h22" />
          </symbol>
          <symbol id="dp-key" viewBox="0 0 130 70">
            <rect x="12" y="16" width="55" height="38" rx="12" />
            <path d="M67 35h45m-10 0v12m-12-12v8" /><circle cx="32" cy="35" r="5" />
          </symbol>
          <symbol id="dp-lines" viewBox="0 0 180 70">
            <path d="M8 58h110M28 36h126M72 14h98" />
          </symbol>
        </defs>

        <g className="text-brand">
          <use href="#dp-car" x="35" y="80" width="220" height="120" />
          <use href="#dp-wheel" x="492" y="55" width="90" height="90" />
          <use href="#dp-gauge" x="920" y="75" width="130" height="90" />
          <use href="#dp-lines" x="260" y="265" width="180" height="70" />
          <use href="#dp-car" x="815" y="320" width="220" height="120" />
          <use href="#dp-wheel" x="80" y="470" width="90" height="90" />
          <use href="#dp-lines" x="410" y="510" width="180" height="70" />
          <use href="#dp-gauge" x="1010" y="600" width="130" height="90" />
          <use href="#dp-car" x="260" y="715" width="220" height="120" />
        </g>
        <g className="text-brand-secondary">
          <use href="#dp-pump" x="700" y="45" width="75" height="105" />
          <use href="#dp-key" x="285" y="420" width="130" height="70" />
          <use href="#dp-lines" x="1035" y="255" width="150" height="58" />
          <use href="#dp-pump" x="25" y="680" width="75" height="105" />
        </g>
        <g className="text-accent-pink">
          <use href="#dp-key" x="930" y="470" width="130" height="70" />
          <use href="#dp-lines" x="40" y="300" width="150" height="58" />
        </g>
        <g className="text-accent-turquoise">
          <use href="#dp-wheel" x="610" y="720" width="90" height="90" />
          <use href="#dp-lines" x="760" y="770" width="180" height="70" />
        </g>
      </svg>
    </div>
  );
}
