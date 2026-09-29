import { cva } from "class-variance-authority";
import { cn } from "cn";

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

const outcomeChipVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-body-sm",
  {
    variants: {
      outcome: {
        "Not Run": "bg-not-run-container text-not-run-on-container",
        Passed: "bg-passed-container text-passed-on-container",
        Failed: "bg-failed-container text-failed-on-container",
        Blocked: "bg-blocked-container text-blocked-on-container",
        Skipped: "bg-skipped-container text-skipped-on-container",
      } satisfies Record<TestResultOutcome, string>,
    },
  },
);

const outcomeDotVariants = cva("size-2 rounded-full", {
  variants: {
    outcome: {
      "Not Run": "bg-not-run",
      Passed: "bg-passed",
      Failed: "bg-failed",
      Blocked: "bg-blocked",
      Skipped: "bg-skipped",
    } satisfies Record<TestResultOutcome, string>,
  },
});

export function OutcomeChip({ outcome }: { outcome: TestResultOutcome }) {
  return (
    <span className={cn(outcomeChipVariants({ outcome }))}>
      <span className={cn(outcomeDotVariants({ outcome }))} aria-hidden="true" />
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
