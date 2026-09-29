import { OUTCOME_TOKENS, OutcomeDot } from "./status-chips";
import { TEST_RESULT_OUTCOMES, type TestResultOutcome } from "@/lib/test-attempts/validation";

/**
 * `DESIGN.md` §4's Progress / Execution Bar — "a single fully-rounded track segmented proportionally
 * across the five status colours, paired with an inline legend of dot + label + tabular count. It is
 * the product's signature object." A pure Server Component: nothing here needs client state, only the
 * numbers its caller already computed (or, on the execution screen, recomputes live as Results are
 * recorded).
 *
 * The legend always shows all five Outcomes, even at zero — unlike the Testing Attempts Timeline's own
 * compact per-Attempt breakdown, which hides zero counts. A live-updating count wants a stable layout
 * that doesn't reflow as a number moves from zero to one; a historical list of many Attempts wants
 * compactness instead. Different jobs, deliberately different renderings of the same numbers.
 */
export function ProgressBar({
  tested,
  total,
  breakdown,
}: {
  tested: number;
  total: number;
  breakdown: Record<TestResultOutcome, number>;
}) {
  return (
    <div className="flex flex-col gap-xs">
      <p className="text-body-md tabular-nums">
        Tested: {tested} / {total}
      </p>

      <div
        role="img"
        aria-label={`Tested ${tested} of ${total}: ${TEST_RESULT_OUTCOMES.map(
          (outcome) => `${outcome} ${breakdown[outcome]}`,
        ).join(", ")}`}
        className="flex h-2 w-full overflow-hidden rounded-full bg-not-run-container"
      >
        {TEST_RESULT_OUTCOMES.map((outcome) => {
          const count = breakdown[outcome];
          if (count === 0 || total === 0) return null;

          return (
            <div
              key={outcome}
              aria-hidden="true"
              className={OUTCOME_TOKENS[outcome].dot}
              style={{ width: `${(count / total) * 100}%` }}
            />
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-sm">
        {TEST_RESULT_OUTCOMES.map((outcome) => (
          <span
            key={outcome}
            className="inline-flex items-center gap-1.5 text-body-sm tabular-nums text-muted-foreground"
          >
            <OutcomeDot outcome={outcome} />
            {outcome}: {breakdown[outcome]}
          </span>
        ))}
      </div>
    </div>
  );
}
