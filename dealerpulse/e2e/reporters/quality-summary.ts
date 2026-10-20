import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { FullResult, Reporter, TestCase, TestResult } from "@playwright/test/reporter";

type Row = { project: string; title: string; status: TestResult["status"]; durationMs: number; retries: number };

/**
 * Writes a short Markdown quality summary per run: totals per project, flaky
 * tests (failed then passed on retry), failures, and the slowest tests. CI
 * appends it to the job summary so the result is readable without opening
 * the HTML report.
 */
export default class QualitySummaryReporter implements Reporter {
  private readonly rows = new Map<string, Row>();
  private readonly outputFile: string;

  constructor(options: { outputFile?: string } = {}) {
    this.outputFile = options.outputFile ?? "test-results/quality-summary.md";
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const project = test.parent.project()?.name ?? "default";
    const key = `${project}::${test.id}`;
    const prev = this.rows.get(key);
    this.rows.set(key, {
      project,
      title: test.titlePath().slice(3).join(" › "),
      status: result.status,
      durationMs: (prev?.durationMs ?? 0) + result.duration,
      retries: result.retry,
    });
  }

  onEnd(result: FullResult): void {
    const rows = [...this.rows.values()];
    const projects = [...new Set(rows.map((r) => r.project))].sort();
    const count = (p: string, s: TestResult["status"]) => rows.filter((r) => r.project === p && r.status === s).length;
    const flaky = rows.filter((r) => r.status === "passed" && r.retries > 0);
    const failed = rows.filter((r) => r.status === "failed" || r.status === "timedOut");
    const slowest = [...rows].sort((a, b) => b.durationMs - a.durationMs).slice(0, 5);

    const lines = [
      `# E2E quality summary: ${result.status.toUpperCase()}`,
      "",
      `Duration: ${(result.duration / 1000).toFixed(1)} s`,
      "",
      "| Project | Passed | Failed | Skipped | Flaky |",
      "|---|---:|---:|---:|---:|",
      ...projects.map(
        (p) =>
          `| ${p} | ${count(p, "passed")} | ${count(p, "failed") + count(p, "timedOut")} | ${count(p, "skipped")} | ${
            flaky.filter((r) => r.project === p).length
          } |`,
      ),
      "",
      "## Failures",
      ...(failed.length ? failed.map((r) => `- [${r.project}] ${r.title}`) : ["None."]),
      "",
      "## Flaky (passed on retry)",
      ...(flaky.length ? flaky.map((r) => `- [${r.project}] ${r.title} (retry ${r.retries})`) : ["None."]),
      "",
      "## Slowest tests",
      ...slowest.map((r) => `- ${(r.durationMs / 1000).toFixed(2)} s [${r.project}] ${r.title}`),
      "",
    ];

    mkdirSync(dirname(this.outputFile), { recursive: true });
    writeFileSync(this.outputFile, lines.join("\n"));
  }

  printsToStdio(): boolean {
    return false;
  }
}
