import type { FunnelStep } from "@/lib/metrics";
import { formatInt, formatPct, stageLabel } from "@/lib/format";

/**
 * A plain-language conversion funnel. Each stage is a bar scaled to the share of
 * all leads that ever reached it, and the drop between consecutive stages is
 * called out explicitly ("118 dropped off") so a non-analyst can read the story
 * top to bottom without decoding a chart.
 */
export function FunnelChart({
  steps,
  showHeadline = true,
}: {
  steps: FunnelStep[];
  showHeadline?: boolean;
}) {
  const top = steps[0]?.reached || 1;
  const delivered = steps[steps.length - 1]?.reached ?? 0;
  const endToEnd = top ? (100 * delivered) / top : 0;

  return (
    <div>
      {showHeadline && (
        <p className="mb-4 text-sm leading-relaxed">
          Of <span className="font-semibold">{formatInt(top)}</span> leads,{" "}
          <span className="font-semibold text-brand">{formatInt(delivered)}</span>{" "}
          reached delivery · a{" "}
          <span className="font-semibold">{formatPct(endToEnd, 0)}</span>{" "}
          end-to-end conversion.
        </p>
      )}
      <ol className="space-y-0">
        {steps.map((s, i) => {
          const pctOfTop = (100 * s.reached) / top;
          const dropped =
            i < steps.length - 1 ? s.reached - steps[i + 1].reached : 0;
          return (
            <li key={s.stage}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">{stageLabel(s.stage)}</span>
                <span className="tabular-nums">
                  <span className="font-semibold">{formatInt(s.reached)}</span>
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    {formatPct(pctOfTop, 0)}
                  </span>
                </span>
              </div>
              <div className="mt-1 h-3 rounded-md bg-muted">
                <div
                  className="h-3 rounded-md bg-gradient-to-r from-brand to-brand/55"
                  style={{ width: `${Math.max(pctOfTop, 1.5)}%` }}
                />
              </div>
              {i < steps.length - 1 && (
                <div className="flex items-center gap-1.5 py-1 pl-1 text-xs text-muted-foreground">
                  <span aria-hidden className="text-red-500/70">
                    ↳
                  </span>
                  {dropped > 0 ? (
                    <span>
                      <span className="font-medium text-red-500">
                        {formatInt(dropped)} dropped off
                      </span>{" "}
                      ({formatPct(s.leakPct ?? 0, 0)})
                    </span>
                  ) : (
                    <span>all advanced</span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
