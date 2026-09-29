"use client";

import { Trash2 } from "lucide-react";
import { useActionState } from "react";

import { ConfirmAction } from "@/app/projects/_components/confirm-action";
import { FormAlert } from "@/components/form/fields";
import { Button } from "@/components/ui/button";
import { testCaseMessages } from "@/lib/test-cases/messages";

import { deleteTestCase, type DeleteTestCaseState } from "./actions";

/**
 * The Case Details page's control over its own Case: a question first, per the spec's "confirmation
 * before deletion" requirement, using the same `ConfirmAction` every other destructive action in the
 * product does.
 */
export function DeleteTestCase({
  projectId,
  releaseId,
  buildId,
  testCaseId,
  code,
}: {
  projectId: string;
  releaseId: string;
  buildId: string;
  testCaseId: string;
  code: string;
}) {
  const [state, formAction] = useActionState(deleteTestCase, {
    message: null,
  } satisfies DeleteTestCaseState);

  // A successful delete redirects away from this page entirely, the same shape `LeaveProject` has —
  // unlike `RemoveMember`, which stays on the page and lets the row's own disappearance be the
  // confirmation. `FormAlert` is `LeaveProject`'s own rendering for exactly this reason.
  return (
    <div className="flex flex-col items-end gap-2xs">
      <FormAlert message={state.message} />

      <ConfirmAction
        trigger={
          <Button variant="destructive">
            <Trash2 aria-hidden="true" />
            Delete
          </Button>
        }
        title={testCaseMessages.deleteTitle(code)}
        description={testCaseMessages.deleteDescription(code)}
        confirmLabel={testCaseMessages.deleteConfirm}
        fields={{ projectId, releaseId, buildId, testCaseId }}
        action={formAction}
      />
    </div>
  );
}
