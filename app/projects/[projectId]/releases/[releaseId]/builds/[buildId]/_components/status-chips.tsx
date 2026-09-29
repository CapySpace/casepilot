import type { TestAttemptStatus, TestResultOutcome } from "@/lib/test-attempts/validation";

/**
 * The two Status/Outcome chips Testing Attempts introduces, per `DESIGN.md`'s Status Chips (§4) and
 * status scale (§2).
 *
 * They are deliberately two different components, not one taking a union of both value sets: an
 * Outcome is a verdict and is drawn from the five-colour status scale, a Attempt's Status is a
 * lifecycle position and is not — see CONTEXT.md's "Status now names two different things" note. The
 * same reasoning is why a Case's own Status/Priority chips (`test-cases-section.tsx`) already render
 * as the plain neutral pill `AttemptStatusChip` reuses, rather than a saturated colour.
 */

/**
 * The status-scale triplet for each Outcome — exported, not private to `OutcomeChip`, because ticket
 * 03's Progress Bar and its Outcome-recording buttons need the same three classes for a segment, a
 * legend dot and a selected control respectively. One source, so all three can never drift apart.
 */
export const OUTCOME_TOKENS: Record<TestResultOutcome, { dot: string; container: string; text: string }> = {
  "Not Run": { dot: "bg-not-run", container: "bg-not-run-container", text: "text-not-run-on-container" },
  Passed: { dot: "bg-passed", container: "bg-passed-container", text: "text-passed-on-container" },
  Failed: { dot: "bg-failed", container: "bg-failed-container", text: "text-failed-on-container" },
  Blocked: { dot: "bg-blocked", container: "bg-blocked-container", text: "text-blocked-on-container" },
  Skipped: { dot: "bg-skipped", container: "bg-skipped-container", text: "text-skipped-on-container" },
};

/** The bare coloured marker, by class rather than by Outcome — what a segment that isn't itself a
 * `TestResultOutcome` (the Build Report's Not Tested, sharing Not Run's token) still needs to render
 * the same dot with. `OutcomeDot` is the Outcome-typed convenience over this that most callers want;
 * this is the one to reach for when the caller only has a token's class to hand. */
export function StatusDot({ className }: { className: string }) {
  return <span aria-hidden="true" className={`size-2 rounded-full ${className}`} />;
}

/** The saturated marker alone — `OutcomeChip`'s own dot, and the one `ProgressBar`'s legend and
 * `ResultPanel`'s recording buttons reuse rather than hand-typing the same span a third and fourth
 * time. */
export function OutcomeDot({ outcome }: { outcome: TestResultOutcome }) {
  return <StatusDot className={OUTCOME_TOKENS[outcome].dot} />;
}

export function OutcomeChip({ outcome }: { outcome: TestResultOutcome }) {
  const token = OUTCOME_TOKENS[outcome];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-body-sm ${token.container} ${token.text}`}>
      <OutcomeDot outcome={outcome} />
      {outcome}
    </span>
  );
}

/**
 * The plain neutral pill every non-verdict fact in this tree renders as — a Case's Priority and
 * Status, an Attempt's own Status. One shared definition rather than three identical copies
 * (`test-cases-section.tsx` and `test-cases/[testCaseId]/page.tsx` each held their own before this).
 */
export function Chip({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-body-sm text-secondary-foreground">
      {children}
    </span>
  );
}

export function AttemptStatusChip({ status }: { status: TestAttemptStatus }) {
  return <Chip>{status}</Chip>;
}

/**
 * A filter `<select>`'s classes, mirroring `Input`'s own stroke, radius and focus ring per `DESIGN.md`
 * §4, so a filter control reads as part of the same control strip as any search field beside it.
 * Shared by every filter this Build subtree has (`TestCasesSection`'s priority/status filters,
 * `FailureOverview`'s Outcome filter) so the two can't drift apart on what "matches the Input" means.
 */
export const FILTER_SELECT_CLASSES =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
