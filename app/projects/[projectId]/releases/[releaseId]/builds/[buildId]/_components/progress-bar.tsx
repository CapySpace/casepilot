import { OUTCOME_TOKENS, StatusDot } from "./status-chips";
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
 *
 * `notTested` is the Build Report's own addition: a Case no Attempt has ever reached, as distinct from
 * `breakdown["Not Run"]` (a Case an Attempt reached, no verdict recorded yet). An Attempt's own
 * progress never has this — every one of its Results already exists the moment the Attempt starts —
 * so this prop is omitted there and the bar renders exactly as it always has. When present, Not Tested
 * gets its own segment and legend entry next to Not Run, sharing that Outcome's Dormant Grey token
 * rather than a new colour: both mean "no verdict yet", and `DESIGN.md`'s status scale has no sixth
 * colour to spend on the distinction — only the label and count separate them.
 */
export function ProgressBar({
  tested,
  total,
  breakdown,
  notTested,
}: {
  tested: number;
  total: number;
  breakdown: Record<TestResultOutcome, number>;
  notTested?: number;
}) {
  const segments: { key: string; label: string; count: number; dotClass: string }[] = [];

  for (const outcome of TEST_RESULT_OUTCOMES) {
    segments.push({
      key: outcome,
      label: outcome,
      count: breakdown[outcome],
      dotClass: OUTCOME_TOKENS[outcome].dot,
    });

    if (outcome === "Not Run" && notTested !== undefined) {
      segments.push({
        key: "Not Tested",
        label: "Not Tested",
        count: notTested,
        dotClass: OUTCOME_TOKENS["Not Run"].dot,
      });
    }
  }

  return (
    <div className="flex flex-col gap-xs">
      <p className="text-body-md tabular-nums">
        Tested: {tested} / {total}
      </p>

      <div
        role="img"
        aria-label={`Tested ${tested} of ${total}: ${segments.map((segment) => `${segment.label} ${segment.count}`).join(", ")}`}
        className="flex h-2 w-full overflow-hidden rounded-full bg-not-run-container"
      >
        {segments.map((segment) => {
          if (segment.count === 0 || total === 0) return null;

          return (
            <div
              key={segment.key}
              aria-hidden="true"
              className={segment.dotClass}
              style={{ width: `${(segment.count / total) * 100}%` }}
            />
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-sm">
        {segments.map((segment) => (
          <span
            key={segment.key}
            className="inline-flex items-center gap-1.5 text-body-sm tabular-nums text-muted-foreground"
          >
            <StatusDot className={segment.dotClass} />
            {segment.label}: {segment.count}
          </span>
        ))}
      </div>
    </div>
  );
}
