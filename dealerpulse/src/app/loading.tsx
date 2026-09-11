/**
 * Route-level loader shown between views (and while a view renders). Kept quiet
 * and unbranded — a pulsing mark + ECG sweep, no wordmark or tagline — because
 * the name/tagline belong only to the once-per-tab intro splash, not to every
 * navigation or refresh.
 */
export default function Loading() {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center">
        <div
          className="grid size-12 place-items-center rounded-xl bg-brand text-brand-foreground shadow-lg shadow-brand/25"
          style={{ animation: "dp-beat 1.3s ease-in-out infinite" }}
        >
          <span className="font-heading text-lg font-bold">DP</span>
        </div>
        <svg width="180" height="40" viewBox="0 0 180 40" fill="none" className="mt-4" aria-hidden>
          <line x1="0" y1="20" x2="180" y2="20" stroke="var(--border)" strokeWidth="1.5" />
          <path
            d="M0 20 H58 L68 20 L74 6 L82 34 L88 20 L98 20 H120 L128 20 L133 12 L139 28 L144 20 H180"
            stroke="var(--brand)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ strokeDasharray: 260, animation: "dp-ecg 1.6s linear infinite" }}
          />
        </svg>
      </div>
    </div>
  );
}
