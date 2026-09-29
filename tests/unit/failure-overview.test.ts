import { describe, expect, it } from "vitest";

import { failedOrBlockedCases } from "@/lib/test-attempts/report";

describe("a Build's Failure Overview", () => {
  it("lists a Case whose latest Result is Failed or Blocked", () => {
    const entries = failedOrBlockedCases(
      [
        { id: "case-1", code: "TC-001", title: "Sign in with valid credentials" },
        { id: "case-2", code: "TC-002", title: "Reset password by email" },
      ],
      [
        {
          attemptNumber: 1,
          results: [
            {
              caseId: "case-1",
              outcome: "Failed",
              resultId: "result-1",
              attemptId: "attempt-1",
              executedBy: "anna",
              executedAt: "2026-01-01T00:00:00.000Z",
            },
            {
              caseId: "case-2",
              outcome: "Blocked",
              resultId: "result-2",
              attemptId: "attempt-1",
              executedBy: "anna",
              executedAt: "2026-01-02T00:00:00.000Z",
            },
          ],
        },
      ],
    );

    expect(entries).toHaveLength(2);
    expect(entries.map((entry) => entry.caseCode)).toEqual(["TC-002", "TC-001"]);
  });

  it("excludes a Case whose latest Result is Passed, Skipped or Not Run", () => {
    const entries = failedOrBlockedCases(
      [{ id: "case-1", code: "TC-001", title: "Sign in with valid credentials" }],
      [
        {
          attemptNumber: 1,
          results: [
            {
              caseId: "case-1",
              outcome: "Passed",
              resultId: "result-1",
              attemptId: "attempt-1",
              executedBy: "anna",
              executedAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        },
      ],
    );

    expect(entries).toHaveLength(0);
  });

  it("takes a Case's latest Result — a later Attempt's Passed clears an earlier Attempt's Failed", () => {
    const entries = failedOrBlockedCases(
      [{ id: "case-1", code: "TC-001", title: "Sign in with valid credentials" }],
      [
        {
          attemptNumber: 1,
          results: [
            {
              caseId: "case-1",
              outcome: "Failed",
              resultId: "result-1",
              attemptId: "attempt-1",
              executedBy: "anna",
              executedAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        },
        {
          attemptNumber: 2,
          results: [
            {
              caseId: "case-1",
              outcome: "Passed",
              resultId: "result-2",
              attemptId: "attempt-2",
              executedBy: "anna",
              executedAt: "2026-01-02T00:00:00.000Z",
            },
          ],
        },
      ],
    );

    expect(entries).toHaveLength(0);
  });

  it("still surfaces a Case no longer in the Ready set passed in — sourced independently of the totals", () => {
    // `failedOrBlockedCases` takes whatever Case list the caller gives it — unlike `buildReportMetrics`,
    // it has no notion of "Ready" at all. A Deprecated Case with an old Failed Result still shows here
    // as long as the caller includes it in `cases`, per ticket 02's own decision.
    const entries = failedOrBlockedCases(
      [{ id: "deprecated-case", code: "TC-001", title: "A case later deprecated" }],
      [
        {
          attemptNumber: 1,
          results: [
            {
              caseId: "deprecated-case",
              outcome: "Failed",
              resultId: "result-1",
              attemptId: "attempt-1",
              executedBy: "anna",
              executedAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        },
      ],
    );

    expect(entries).toHaveLength(1);
    expect(entries[0].caseId).toBe("deprecated-case");
  });

  it("carries the Result and Attempt ids a caller needs to link through to the Result", () => {
    const entries = failedOrBlockedCases(
      [{ id: "case-1", code: "TC-001", title: "Sign in with valid credentials" }],
      [
        {
          attemptNumber: 1,
          results: [
            {
              caseId: "case-1",
              outcome: "Failed",
              resultId: "result-1",
              attemptId: "attempt-1",
              executedBy: "anna",
              executedAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        },
      ],
    );

    expect(entries[0]).toMatchObject({
      resultId: "result-1",
      attemptId: "attempt-1",
      executedBy: "anna",
      executedAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("reports an empty list for a Build with no Failed or Blocked Cases", () => {
    expect(failedOrBlockedCases([], [])).toEqual([]);
  });
});
