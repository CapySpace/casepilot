"use client";

import { CheckCheck } from "lucide-react";
import { useActionState } from "react";

import { FormAlert } from "@/components/form/fields";
import { Button } from "@/components/ui/button";

import { completeTestAttempt, type CompleteTestAttemptState } from "../actions";

/**
 * The execution screen's own committing action — no confirmation dialog, unlike deleting an Attempt:
 * nothing is lost by completing (every Result recorded so far survives, frozen), so this isn't the
 * same class of decision as a destructive one. It succeeds with Cases still `Not Run` by design — see
 * the Action's own comment.
 */
export function CompleteAttemptForm({
  projectId,
  releaseId,
  buildId,
  attemptId,
}: {
  projectId: string;
  releaseId: string;
  buildId: string;
  attemptId: string;
}) {
  const [state, formAction] = useActionState(completeTestAttempt, {
    message: null,
  } satisfies CompleteTestAttemptState);

  return (
    <div className="flex flex-col items-end gap-2xs">
      <FormAlert message={state.message} />

      <form action={formAction}>
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="releaseId" value={releaseId} />
        <input type="hidden" name="buildId" value={buildId} />
        <input type="hidden" name="attemptId" value={attemptId} />
        <Button type="submit">
          <CheckCheck aria-hidden="true" />
          Complete Attempt
        </Button>
      </form>
    </div>
  );
}
