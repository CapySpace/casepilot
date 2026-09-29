import { TEST_RESULT_OUTCOMES, type TestResultOutcome } from "./validation";

/** One Attempt's Results, as far as the Build Report's aggregation needs to see them. */
export type ReportAttempt = {
  attemptNumber: number;
  results: { caseId: string; outcome: TestResultOutcome }[];
};

export type BuildReportMetrics = {
  /** Ready Cases only — see the function's own comment for why. */
  total: number;
  /** `total` minus `notTestedForSummary`: Cases with a real, current verdict. */
  tested: number;
  /**
   * Not Run and Not Tested folded into one number, for the summary card — matching the shape the
   * original brief's own example table uses. The two stay distinct in `breakdown` and `notTested`
   * for views that need the finer difference.
   */
  notTestedForSummary: number;
  /** Per-Outcome counts among Ready Cases, computed from each Case's latest Result. */
  breakdown: Record<TestResultOutcome, number>;
  /** Ready Cases no Attempt has ever reached — distinct from `breakdown["Not Run"]`, which counts a
   * Case an Attempt *did* reach but hasn't been given a verdict in. Never a stored value or a sixth
   * Outcome — see `CONTEXT.md`'s Outcome note. */
  notTested: number;
  /** 0–100, one decimal place; `0`, not `NaN`, when `total` is `0`. */
  completionPercent: number;
  /** `Passed ÷ tested`, 0–100, one decimal place; `0`, not `NaN`, when `tested` is `0`. */
  passRate: number;
};

/**
 * A Build's Report, computed from its live `Ready` Cases and every Attempt taken against it — no
 * stored statistics, matching the phase's own instruction to avoid a dedicated table until
 * performance demands one.
 *
 * Every Attempt the caller passes in counts, In Progress or Completed alike: this function has no
 * notion of Attempt status at all, by design — gating on Completed would make the Report's own
 * progress stale, which defeats the point of Progress Tracking. A Case's status is decided by
 * whichever Attempt reached it most recently (the highest `attemptNumber` among the Attempts that
 * include a Result for it); an older Attempt's verdict for the same Case is never used once a newer
 * one supersedes it, even if the newer one only got as far as `Not Run`.
 *
 * `readyCaseIds` is the current, live set — a Case's own Status can change after it was tested, so a
 * since-Deprecated Case's old Result is simply absent from this computation once it's no longer in
 * that list, per the "only Ready Cases count" decision. Passing in every Case regardless of Status
 * would silently reintroduce Draft and Deprecated Cases into the totals.
 */
export function buildReportMetrics(readyCaseIds: string[], attempts: ReportAttempt[]): BuildReportMetrics {
  const latestByCase = new Map<string, { attemptNumber: number; outcome: TestResultOutcome }>();

  for (const attempt of attempts) {
    for (const result of attempt.results) {
      const current = latestByCase.get(result.caseId);
      if (!current || attempt.attemptNumber > current.attemptNumber) {
        latestByCase.set(result.caseId, { attemptNumber: attempt.attemptNumber, outcome: result.outcome });
      }
    }
  }

  const breakdown = Object.fromEntries(TEST_RESULT_OUTCOMES.map((outcome) => [outcome, 0])) as Record<
    TestResultOutcome,
    number
  >;
  let notTested = 0;

  for (const caseId of readyCaseIds) {
    const latest = latestByCase.get(caseId);
    if (!latest) {
      notTested += 1;
    } else {
      breakdown[latest.outcome] += 1;
    }
  }

  const total = readyCaseIds.length;
  const notTestedForSummary = breakdown["Not Run"] + notTested;
  const tested = total - notTestedForSummary;

  return {
    total,
    tested,
    notTestedForSummary,
    breakdown,
    notTested,
    completionPercent: total === 0 ? 0 : roundToOneDecimal((tested / total) * 100),
    passRate: tested === 0 ? 0 : roundToOneDecimal((breakdown.Passed / tested) * 100),
  };
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}
