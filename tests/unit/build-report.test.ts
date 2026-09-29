import { describe, expect, it } from "vitest";

import { buildReportMetrics } from "@/lib/test-attempts/report";

describe("a Build Report's metrics", () => {
  it("takes a Case's latest Result — the highest-numbered Attempt that reached it — never an older one", () => {
    const metrics = buildReportMetrics(
      ["case-1"],
      [
        { attemptNumber: 1, results: [{ caseId: "case-1", outcome: "Failed" }] },
        { attemptNumber: 2, results: [{ caseId: "case-1", outcome: "Passed" }] },
      ],
    );

    expect(metrics.breakdown.Passed).toBe(1);
    expect(metrics.breakdown.Failed).toBe(0);
  });

  it("never falls back to an older Attempt's verdict once a newer Attempt has reached the Case", () => {
    // Attempt #2 is the latest and hasn't given case-1 a real verdict yet — Attempt #1's Passed,
    // though real, must not surface once a newer Attempt supersedes it.
    const metrics = buildReportMetrics(
      ["case-1"],
      [
        { attemptNumber: 1, results: [{ caseId: "case-1", outcome: "Passed" }] },
        { attemptNumber: 2, results: [{ caseId: "case-1", outcome: "Not Run" }] },
      ],
    );

    expect(metrics.breakdown.Passed).toBe(0);
    expect(metrics.breakdown["Not Run"]).toBe(1);
  });

  it("counts a Case reached only by a still-in-progress Attempt — the function has no notion of Attempt status, by design", () => {
    // An in-progress Attempt is passed in exactly like a Completed one: the caller decides which
    // Attempts to include, and per the product decision every Attempt counts, live.
    const metrics = buildReportMetrics(
      ["case-1"],
      [{ attemptNumber: 1, results: [{ caseId: "case-1", outcome: "Passed" }] }],
    );

    expect(metrics.breakdown.Passed).toBe(1);
    expect(metrics.tested).toBe(1);
  });

  it("distinguishes Not Tested (no Attempt has ever reached the Case) from Not Run (reached, no verdict yet)", () => {
    const metrics = buildReportMetrics(
      ["reached", "untouched"],
      [{ attemptNumber: 1, results: [{ caseId: "reached", outcome: "Not Run" }] }],
    );

    expect(metrics.breakdown["Not Run"]).toBe(1);
    expect(metrics.notTested).toBe(1);
    expect(metrics.total).toBe(2);
  });

  it("folds Not Run and Not Tested into one summary number, but keeps them distinct underneath", () => {
    const metrics = buildReportMetrics(
      ["not-run-case", "not-tested-case", "passed-case"],
      [
        { attemptNumber: 1, results: [{ caseId: "not-run-case", outcome: "Not Run" }] },
        { attemptNumber: 1, results: [{ caseId: "passed-case", outcome: "Passed" }] },
      ],
    );

    expect(metrics.notTestedForSummary).toBe(2);
    expect(metrics.breakdown["Not Run"]).toBe(1);
    expect(metrics.notTested).toBe(1);
    expect(metrics.tested).toBe(1);
  });

  it("only counts Cases passed in as Ready — a Result for a Case outside that list doesn't affect the totals", () => {
    const metrics = buildReportMetrics(
      ["ready-case"],
      [
        { attemptNumber: 1, results: [{ caseId: "ready-case", outcome: "Passed" }] },
        // "deprecated-case" isn't in the Ready list at all — its Result must not leak into the tally.
        { attemptNumber: 1, results: [{ caseId: "deprecated-case", outcome: "Failed" }] },
      ],
    );

    expect(metrics.total).toBe(1);
    expect(metrics.breakdown.Passed).toBe(1);
    expect(metrics.breakdown.Failed).toBe(0);
  });

  it("reports well-formed zeros, not a division error, for a Build with no Ready Cases", () => {
    const metrics = buildReportMetrics([], []);

    expect(metrics.total).toBe(0);
    expect(metrics.tested).toBe(0);
    expect(metrics.completionPercent).toBe(0);
    expect(metrics.passRate).toBe(0);
  });

  it("reports a pass rate of 0, not NaN, when nothing has been tested yet", () => {
    const metrics = buildReportMetrics(["case-1", "case-2"], []);

    expect(metrics.tested).toBe(0);
    expect(metrics.passRate).toBe(0);
  });

  it("computes completion percentage and pass rate to one decimal place", () => {
    // 120 total, 95 tested (70 Passed, 15 Failed, 5 Blocked, 5 Skipped), 25 Not Tested — the
    // original brief's own worked example.
    const attempts = [
      {
        attemptNumber: 1,
        results: [
          ...Array.from({ length: 70 }, (_, i) => ({ caseId: `passed-${i}`, outcome: "Passed" as const })),
          ...Array.from({ length: 15 }, (_, i) => ({ caseId: `failed-${i}`, outcome: "Failed" as const })),
          ...Array.from({ length: 5 }, (_, i) => ({ caseId: `blocked-${i}`, outcome: "Blocked" as const })),
          ...Array.from({ length: 5 }, (_, i) => ({ caseId: `skipped-${i}`, outcome: "Skipped" as const })),
        ],
      },
    ];
    const readyCaseIds = [
      ...attempts[0].results.map((r) => r.caseId),
      ...Array.from({ length: 25 }, (_, i) => `not-tested-${i}`),
    ];

    const metrics = buildReportMetrics(readyCaseIds, attempts);

    expect(metrics.total).toBe(120);
    expect(metrics.tested).toBe(95);
    expect(metrics.notTestedForSummary).toBe(25);
    expect(metrics.completionPercent).toBeCloseTo(79.2, 1);
    expect(metrics.passRate).toBeCloseTo(73.7, 1);
  });
});
