"use client";

import { Play } from "lucide-react";
import { useActionState } from "react";

import { FormAlert } from "@/components/form/fields";
import { Button } from "@/components/ui/button";
import { testResultMessages } from "@/lib/test-attempts/messages";

import { startTestAttempt, type StartTestAttemptState } from "../attempts/actions";

/**
 * The Testing Attempts section's own entry point: DESIGN.md §4's primary-button worked example,
 * `▶ Run / Record Attempt`, dispatching `startTestAttempt` with no fields of its own to fill in.
 *
 * Disabled, with the reason stated beside it, when the Build has no eligible Cases — the interface's
 * side of the refusal `start_test_attempt` itself enforces regardless; this is what stops a Member
 * reaching a failed submission for a fact already visible on the page.
 */
export function StartAttemptForm({
  projectId,
  releaseId,
  buildId,
  hasEligibleCases,
}: {
  projectId: string;
  releaseId: string;
  buildId: string;
  hasEligibleCases: boolean;
}) {
  const [state, formAction] = useActionState(startTestAttempt, {
    message: null,
  } satisfies StartTestAttemptState);

  return (
    <div className="flex flex-col items-end gap-2xs">
      <FormAlert message={state.message} />

      <form action={formAction}>
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="releaseId" value={releaseId} />
        <input type="hidden" name="buildId" value={buildId} />
        <Button type="submit" disabled={!hasEligibleCases}>
          <Play aria-hidden="true" />
          Record Attempt
        </Button>
      </form>

      {!hasEligibleCases && (
        <p className="max-w-64 text-right text-body-sm text-muted-foreground">
          {testResultMessages.noEligibleCases}
        </p>
      )}
    </div>
  );
}
