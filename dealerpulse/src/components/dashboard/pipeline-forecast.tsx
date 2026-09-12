import type { PipelineForecast } from "@/lib/insights";
import { formatCrore, formatInt, formatPct, stageLabel } from "@/lib/format";

/**
 * Probability-weighted pipeline forecast: the open book discounted by each
 * lead's stage close rate. The do-nothing baseline — "what lands if the team
 * works today's pipeline at its usual effectiveness."
 */
export function PipelineForecastPanel({
  forecast,
}: {
  forecast: PipelineForecast;
}) {
  const { openCount, openValue, expectedUnits, expectedValue, byStage } =
    forecast;
  const confidence = openValue ? (100 * expectedValue) / openValue : 0;

  if (openCount === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No open deals to forecast.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Headline: expected vs face value */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-brand/[0.06] p-3 ring-1 ring-brand/15">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Expected to deliver
          </div>
          <div className="mt-1 font-heading text-2xl font-semibold leading-none tabular-nums text-brand">
            {expectedUnits.toFixed(1)}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              units
            </span>
          </div>
          <div className="mt-1.5 text-sm font-medium tabular-nums">
            {formatCrore(expectedValue)}
          </div>
        </div>
        <div className="rounded-lg bg-muted/40 p-3 ring-1 ring-foreground/10">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Open pipeline
          </div>
          <div className="mt-1 font-heading text-2xl font-semibold leading-none tabular-nums">
            {formatInt(openCount)}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              leads
            </span>
          </div>
          <div className="mt-1.5 text-sm font-medium tabular-nums text-muted-foreground">
            {formatCrore(openValue)}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Expected revenue: {" "}
        <span className="font-medium text-foreground">
          {formatCrore(expectedValue)}
        </span>{" "}
        ({formatPct(confidence, 0)} of open pipeline).
      </p>

      {/* Per-stage breakdown */}
      <div className="space-y-1.5">
        {byStage.map((s) => (
          <div key={s.stage} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm sm:flex sm:gap-3">
            <span className="min-w-0 font-medium sm:w-28 sm:shrink-0">
              {stageLabel(s.stage)}
            </span>
            <span className="tabular-nums text-muted-foreground sm:w-32 sm:shrink-0">
              {formatInt(s.count)} × {formatPct(s.p * 100, 0)}
            </span>
            <div className="h-2 min-w-0 rounded-full bg-muted sm:flex-1">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-brand to-brand/55"
                style={{
                  width: `${expectedUnits ? (100 * s.expectedUnits) / expectedUnits : 0}%`,
                }}
              />
            </div>
            <span className="text-right tabular-nums font-medium sm:w-20 sm:shrink-0">
              {s.expectedUnits.toFixed(1)}
            </span>
          </div>
        ))}
      </div>

    </div>
  );
}
