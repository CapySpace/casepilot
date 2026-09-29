import { TEST_RESULT_OUTCOMES, type TestResultOutcome } from "./validation";

/** One Attempt's Results, as far as the Build Report's aggregation needs to see them. */
export type ReportAttempt = {
  attemptNumber: number;
  results: { caseId: string; outcome: TestResultOutcome }[];
};

/**
 * Reduces any shape of Attempts down to one winning Result per Case — the Result belonging to the
 * highest `attemptNumber` among the Attempts that include one for that Case, never an older Attempt's
 * once a newer one supersedes it. Shared by `buildReportMetrics` and `failedOrBlockedCases`, which
 * need this exact reduction over two different, differently-detailed shapes of Result (a bare
 * `{caseId, outcome}` for the former, a Result carrying its own id and Attempt id for the latter) —
 * generic over `TResult` rather than duplicated once per shape.
 */
function latestResultsByCase<TResult extends { caseId: string; outcome: TestResultOutcome }>(
  attempts: { attemptNumber: number; results: TResult[] }[],
): Map<string, TResult & { attemptNumber: number }> {
  const latest = new Map<string, TResult & { attemptNumber: number }>();

  for (const attempt of attempts) {
    for (const result of attempt.results) {
      const current = latest.get(result.caseId);
      if (!current || attempt.attemptNumber > current.attemptNumber) {
        latest.set(result.caseId, { ...result, attemptNumber: attempt.attemptNumber });
      }
    }
  }

  return latest;
}

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
  const latestByCase = latestResultsByCase(attempts);

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

/** One Attempt's Results, as far as the Failure Overview needs to see them — the same reduction as
 * `ReportAttempt`, but each Result also carries what a Failure Overview row and its link need. */
export type FailureOverviewAttempt = {
  attemptNumber: number;
  results: {
    caseId: string;
    outcome: TestResultOutcome;
    resultId: string;
    attemptId: string;
    executedBy: string | null;
    executedAt: string | null;
  }[];
};

/** A Case as the Failure Overview needs it: live code and title, not the Result's own frozen
 * snapshot — this is "what is this Case called now", not "what did it say back then". */
export type FailureOverviewCase = { id: string; code: string; title: string };

export type FailureOverviewEntry = {
  caseId: string;
  caseCode: string;
  caseTitle: string;
  outcome: "Failed" | "Blocked";
  attemptId: string;
  resultId: string;
  executedBy: string | null;
  executedAt: string | null;
};

/**
 * Every Case — Ready or not — whose latest Result is Failed or Blocked, most recently recorded
 * first. Sourced independently of `buildReportMetrics`'s totals: the caller passes in whichever Cases
 * it wants considered, with no "only Ready" filtering built in here, so a Case that was Deprecated
 * after being tested still surfaces as long as the caller includes it — a real failure doesn't stop
 * being one just because the Case's own lifecycle moved on since.
 */
export function failedOrBlockedCases(
  cases: FailureOverviewCase[],
  attempts: FailureOverviewAttempt[],
): FailureOverviewEntry[] {
  const latestByCase = latestResultsByCase(attempts);

  const entries: FailureOverviewEntry[] = [];

  for (const testCase of cases) {
    const latest = latestByCase.get(testCase.id);
    if (!latest) continue;
    if (latest.outcome !== "Failed" && latest.outcome !== "Blocked") continue;

    entries.push({
      caseId: testCase.id,
      caseCode: testCase.code,
      caseTitle: testCase.title,
      outcome: latest.outcome,
      attemptId: latest.attemptId,
      resultId: latest.resultId,
      executedBy: latest.executedBy,
      executedAt: latest.executedAt,
    });
  }

  return entries.sort((a, b) => (b.executedAt ?? "").localeCompare(a.executedAt ?? ""));
}
