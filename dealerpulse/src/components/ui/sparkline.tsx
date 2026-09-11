/**
 * A tiny inline-SVG trend line for KPI cards. Pure presentational: give it a
 * chronological series and it normalizes to its own min/max. No axes, no labels
 * — it reads as texture beside a number, not as a chart. Returns null for a
 * series too short to show a trend.
 */
export function Sparkline({
  values,
  width = 72,
  height = 22,
  className,
}: {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = width / (values.length - 1);
  // Inset by the stroke half-width so the line never clips at the edges.
  const pad = 1.5;
  const y = (v: number) =>
    height - pad - ((v - min) / span) * (height - pad * 2);
  const pts = values.map((v, i) => [i * stepX, y(v)] as const);
  const line = pts.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden
      className={className}
    >
      <polyline
        points={line}
        stroke="var(--brand)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.85}
      />
      <circle cx={last[0]} cy={last[1]} r={1.75} fill="var(--brand)" />
    </svg>
  );
}
