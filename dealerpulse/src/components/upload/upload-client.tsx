"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type UploadSeed = {
  nextMonth: string; // e.g. "2026-01"
  nextLeadNum: number;
  branches: { id: string; repId: string }[];
};

type Summary = {
  branches: Diff;
  sales_reps: Diff;
  leads: Diff;
  targets: Diff;
  deliveries: Diff;
  newMonths: string[];
};
type Diff = { added: number; updated: number };

const SECTIONS = ["branches", "sales_reps", "leads", "targets", "deliveries"] as const;

/** Build a small, schema-valid continuation so the flow is demoable without a file. */
function demoContinuation(seed: UploadSeed) {
  const { nextMonth } = seed;
  const leads: unknown[] = [];
  const deliveries: unknown[] = [];
  const targets = seed.branches.map((b) => ({
    branch_id: b.id,
    month: nextMonth,
    target_units: 20,
    target_revenue: 35_000_000,
  }));
  let n = seed.nextLeadNum;
  seed.branches.forEach((b) => {
    const idDelivered = `L${String(n++).padStart(4, "0")}`;
    const idOpen = `L${String(n++).padStart(4, "0")}`;
    // A delivered lead (full journey) so revenue/attainment move.
    leads.push({
      id: idDelivered,
      customer_name: `Demo Buyer ${idDelivered}`,
      phone: "+91 90000 00000",
      source: "walk_in",
      model_interested: "Fortuner",
      status: "delivered",
      assigned_to: b.repId,
      branch_id: b.id,
      created_at: `${nextMonth}-03T10:00:00Z`,
      last_activity_at: `${nextMonth}-20T10:00:00Z`,
      deal_value: 4_200_000,
      status_history: [
        { status: "new", timestamp: `${nextMonth}-03T10:00:00Z` },
        { status: "contacted", timestamp: `${nextMonth}-05T10:00:00Z` },
        { status: "test_drive", timestamp: `${nextMonth}-08T10:00:00Z` },
        { status: "negotiation", timestamp: `${nextMonth}-12T10:00:00Z` },
        { status: "order_placed", timestamp: `${nextMonth}-15T10:00:00Z` },
        { status: "delivered", timestamp: `${nextMonth}-20T10:00:00Z` },
      ],
    });
    deliveries.push({
      lead_id: idDelivered,
      order_date: `${nextMonth}-15`,
      delivery_date: `${nextMonth}-20`,
      days_to_deliver: 5,
    });
    // An open lead so the pipeline/action-center change too.
    leads.push({
      id: idOpen,
      customer_name: `Demo Prospect ${idOpen}`,
      phone: "+91 90000 00001",
      source: "website",
      model_interested: "Innova Hycross",
      status: "contacted",
      assigned_to: b.repId,
      branch_id: b.id,
      created_at: `${nextMonth}-06T10:00:00Z`,
      last_activity_at: `${nextMonth}-07T10:00:00Z`,
      expected_close_date: `${nextMonth}-28`,
      deal_value: 2_600_000,
      status_history: [
        { status: "new", timestamp: `${nextMonth}-06T10:00:00Z` },
        { status: "contacted", timestamp: `${nextMonth}-07T10:00:00Z` },
      ],
    });
  });
  return { metadata: { note: "Demo continuation" }, leads, deliveries, targets };
}

function countOf(payload: Record<string, unknown>, key: string): number {
  const v = payload[key];
  return Array.isArray(v) ? v.length : 0;
}

export function UploadClient({ seed, merged }: { seed: UploadSeed; merged: boolean }) {
  const router = useRouter();
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  // Track live merge state on the client so the Reset control flips instantly,
  // not only after a server prop refresh settles.
  const [mergedNow, setMergedNow] = useState(merged);
  useEffect(() => setMergedNow(merged), [merged]);

  const loadFile = async (file: File) => {
    setError(null);
    setSummary(null);
    try {
      const parsed = JSON.parse(await file.text());
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("Expected a JSON object with dataset sections.");
      }
      setPayload(parsed as Record<string, unknown>);
      setFileName(file.name);
    } catch (e) {
      setPayload(null);
      setFileName(null);
      setError(e instanceof Error ? e.message : "Could not read file.");
    }
  };

  const loadDemo = () => {
    setError(null);
    setSummary(null);
    setPayload(demoContinuation(seed) as unknown as Record<string, unknown>);
    setFileName("demo-continuation.json (generated)");
  };

  const merge = async () => {
    if (!payload) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/dataset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Merge failed.");
        return;
      }
      setSummary(body.summary as Summary);
      setPayload(null);
      setFileName(null);
      setMergedNow(true);
      router.refresh();
    } catch {
      setError("Network error while merging.");
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setBusy(true);
    setError(null);
    setSummary(null);
    try {
      await fetch("/api/dataset", { method: "DELETE" });
      setMergedNow(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add a continuation</CardTitle>
          <CardDescription>
            A JSON object with any of: <code>leads</code>, <code>deliveries</code>,{" "}
            <code>targets</code>, <code>branches</code>, <code>sales_reps</code>.
            Records are upserted by id, so new records are added and existing ones
            are updated.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90">
              Choose JSON file
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) loadFile(f);
                }}
              />
            </label>
            <Button variant="outline" size="sm" onClick={loadDemo} disabled={busy}>
              Generate demo continuation
            </Button>
          </div>

          {error && (
            <p className="rounded-md bg-red-500/10 p-2.5 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          {payload && (
            <div className="rounded-md border border-border/60 p-3 text-sm">
              <div className="mb-2 font-medium">
                Ready to merge{fileName ? `: ${fileName}` : ""}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                {SECTIONS.map((s) => {
                  const c = countOf(payload, s);
                  return c > 0 ? (
                    <span key={s} className="tabular-nums">
                      {c} {s.replace("_", " ")}
                    </span>
                  ) : null;
                })}
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={merge} disabled={busy}>
                  {busy ? "Merging…" : "Merge into dataset"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPayload(null);
                    setFileName(null);
                  }}
                  disabled={busy}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {summary && (
            <div className="rounded-md bg-emerald-500/10 p-3 text-sm">
              <div className="mb-1 font-medium text-emerald-700 dark:text-emerald-400">
                Merged successfully.
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                {SECTIONS.map((s) => {
                  const diff = summary[s];
                  return diff.added || diff.updated ? (
                    <span key={s} className="tabular-nums">
                      {s.replace("_", " ")}: +{diff.added}
                      {diff.updated ? ` / ~${diff.updated}` : ""}
                    </span>
                  ) : null;
                })}
                {summary.newMonths.length > 0 && (
                  <span>new months: {summary.newMonths.join(", ")}</span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live dataset</CardTitle>
          <CardDescription>
            {mergedNow
              ? "Showing a merged dataset. Reset to return to the original bundled data."
              : "Showing the original bundled dataset."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Button
              variant={mergedNow ? "destructive" : "outline"}
              size="sm"
              onClick={reset}
              disabled={busy || !mergedNow}
            >
              {busy ? "Resetting…" : "Reset to original"}
            </Button>
            {!mergedNow && (
              <span className="text-xs text-muted-foreground">
                Nothing to reset — merge some data first.
              </span>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Merges are held in server memory for the running instance: they persist
            while the app is warm and reset on restart or redeploy. Production would
            back this with a datastore.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
