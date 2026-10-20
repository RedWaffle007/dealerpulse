import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;
const CI = !!process.env.CI;

/**
 * Three projects:
 * - `desktop` runs every read-only spec in parallel against a production build.
 * - `mobile` reruns the specs tagged @responsive at phone size.
 * - `mutating` holds the specs that change server state (the upload/merge flow).
 *   It depends on the other two, so a merge can never leak into a read-only run,
 *   and runs on a single worker because the dataset overlay is process-wide.
 */
export default defineConfig({
  testDir: "./e2e/tests",
  outputDir: "./test-results/artifacts",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  workers: CI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 7_500 },
  reporter: CI
    ? [
        ["github"],
        ["list"],
        ["html", { outputFolder: "playwright-report", open: "never" }],
        ["junit", { outputFile: "test-results/junit.xml" }],
        ["./e2e/reporters/quality-summary.ts", { outputFile: "test-results/quality-summary.md" }],
      ]
    : [
        ["list"],
        ["html", { outputFolder: "playwright-report", open: "never" }],
        ["junit", { outputFile: "test-results/junit.xml" }],
        ["./e2e/reporters/quality-summary.ts", { outputFile: "test-results/quality-summary.md" }],
      ],
  use: {
    baseURL: BASE_URL,
    trace: CI ? "on-first-retry" : "retain-on-failure",
    screenshot: "only-on-failure",
    video: CI ? "retain-on-failure" : "off",
    locale: "en-IN",
    timezoneId: "Asia/Kolkata",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /mutating\//,
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
      grep: /@responsive/,
      testIgnore: /mutating\//,
    },
    {
      name: "mutating",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /mutating\/.*\.spec\.ts/,
      fullyParallel: false,
      // One worker: two files merging and resetting the same overlay at once would race.
      workers: 1,
      dependencies: ["desktop", "mobile"],
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // `npm run test:e2e` builds first; the server here only starts it.
        command: `npm run start -- -p ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: !CI,
        timeout: 120_000,
        stdout: "ignore",
        stderr: "pipe",
        // In-memory overlay only: never let an e2e run write to a real Blob store.
        env: { BLOB_READ_WRITE_TOKEN: "" },
      },
});
