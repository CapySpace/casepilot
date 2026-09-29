import type { TestAttemptStatus, TestResultOutcome } from "./validation";

/**
 * How the Testing Attempts Timeline colours one Attempt's medallion — DESIGN.md §4's Timeline example
 * assumes a single pass/fail verdict per entry, which an Attempt does not have (it has a Status and a
 * spread of Outcomes across its Results), so this is the adaptation the phase spec calls for: any
 * Failed Result outranks everything else, then any Blocked or Skipped, then — only once Completed,
 * with nothing left Not Run — an all-Passed verdict, and otherwise the same Dormant Grey the Not Run
 * Outcome itself uses, since no conclusive verdict has been reached yet.
 */
export type AttemptMedallionTone = "failed" | "attention" | "passed" | "dormant";

export function attemptMedallionTone({
  status,
  breakdown,
}: {
  status: TestAttemptStatus;
  breakdown: Record<TestResultOutcome, number>;
}): AttemptMedallionTone {
  if (breakdown.Failed > 0) return "failed";
  if (breakdown.Blocked > 0 || breakdown.Skipped > 0) return "attention";
  if (status === "Completed" && breakdown["Not Run"] === 0) return "passed";
  return "dormant";
}
