"use client";

import { Trash2 } from "lucide-react";
import { useActionState } from "react";

import { ConfirmAction } from "@/app/projects/_components/confirm-action";
import { FormAlert } from "@/components/form/fields";
import { Button } from "@/components/ui/button";
import { testResultMessages } from "@/lib/test-attempts/messages";

import { deleteTestAttempt, type DeleteTestAttemptState } from "../actions";

/**
 * Deleting an in-progress Attempt: a question first, the same `ConfirmAction` every destructive action
 * in the product uses. Shared between the Testing Attempts section (Build Details) and the Attempt
 * Report — the two places the spec names — rather than two copies of the same dialog.
 *
 * Rendered only for an `In Progress` Attempt by both callers; the underlying refusal for a Completed
 * one is row-level security's own doing regardless (`test_attempts`' delete policy), so there is
 * nothing here to double-check before rendering.
 */
export function DeleteAttempt({
  projectId,
  releaseId,
  buildId,
  attemptId,
  attemptNumber,
}: {
  projectId: string;
  releaseId: string;
  buildId: string;
  attemptId: string;
  attemptNumber: number;
}) {
  const [state, formAction] = useActionState(deleteTestAttempt, {
    message: null,
  } satisfies DeleteTestAttemptState);

  return (
    <div className="flex flex-col items-end gap-2xs">
      <FormAlert message={state.message} />

      <ConfirmAction
        trigger={
          <Button variant="destructive" size="sm">
            <Trash2 aria-hidden="true" />
            Delete
          </Button>
        }
        title={testResultMessages.deleteAttemptTitle(attemptNumber)}
        description={testResultMessages.deleteAttemptDescription(attemptNumber)}
        confirmLabel={testResultMessages.deleteAttemptConfirm}
        fields={{ projectId, releaseId, buildId, attemptId }}
        action={formAction}
      />
    </div>
  );
}
