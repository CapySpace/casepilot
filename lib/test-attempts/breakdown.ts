import { TEST_RESULT_OUTCOMES, type TestResultOutcome } from "./validation";

/**
 * How many Results hold each Outcome — the one computation the Testing Attempts list, the execution
 * screen and the Attempt Report all need, kept in one place so the three can't drift apart on what
 * counting means. Every Outcome is present in the result, even at zero: a caller that wants to skip
 * zero counts (the Timeline's own compact entries do) filters this afterward, rather than this
 * function guessing which caller wants what.
 */
export function outcomeBreakdown(results: { outcome: TestResultOutcome }[]): Record<TestResultOutcome, number> {
  const breakdown = Object.fromEntries(TEST_RESULT_OUTCOMES.map((outcome) => [outcome, 0])) as Record<
    TestResultOutcome,
    number
  >;

  for (const result of results) breakdown[result.outcome] += 1;

  return breakdown;
}
