"use client";

import { UserMinus } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { projectMessages } from "@/lib/projects/messages";

import { ConfirmAction } from "../../../_components/confirm-action";
import { removeFromProject, type RemoveState } from "../actions";

/**
 * The Owner's control over one row of the Members list.
 *
 * One `useActionState` per row rather than one for the table: a failure belongs beside the person it is
 * about, and a shared one would report the last failed removal next to somebody else. There is no success
 * state to report — the row disappears, which is what a successful removal looks like.
 */
export function RemoveMember({
  projectId,
  userId,
  name,
}: {
  projectId: string;
  userId: string;
  name: string;
}) {
  const [state, formAction] = useActionState(removeFromProject, {
    message: null,
  } satisfies RemoveState);

  // After a successful removal the row is gone, so a message here is always a failure — and a failure has to
  // leave the control standing, or the only way to try again is to reload the page.
  return (
    <div className="flex flex-col items-end gap-2xs">
      {state.message && <p className="text-body-sm text-destructive">{state.message}</p>}

      <ConfirmAction
        trigger={
          <Button variant="ghost" size="sm" aria-label={`Remove ${name}`}>
            <UserMinus aria-hidden="true" />
            Remove
          </Button>
        }
        title={projectMessages.removeTitle(name)}
        description={projectMessages.removeDescription(name)}
        confirmLabel={projectMessages.removeConfirm}
        fields={{ projectId, userId }}
        action={formAction}
      />
    </div>
  );
}
