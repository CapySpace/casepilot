"use client";

import { Clock, TriangleAlert, X } from "lucide-react";
import { useActionState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatDay } from "@/lib/dates";
import type { PendingInvitation } from "@/lib/projects/dal";
import { projectMessages } from "@/lib/projects/messages";

import { ConfirmAction } from "../../../_components/confirm-action";
import { cancelInvitation, type CancelState } from "../actions";

/**
 * The Invitations still waiting, and the Owner's one control over them.
 *
 * Cancelling asks first, like the other two destructive actions. Ticket 05 built the control and deferred
 * the question to this ticket, which is where the dialog arrived; the address can be invited again
 * immediately, but a link somebody is about to follow is still worth one press of confirmation.
 */
export function PendingInvitations({
  projectId,
  invitations,
}: {
  projectId: string;
  invitations: PendingInvitation[];
}) {
  const [state, formAction] = useActionState(cancelInvitation, {
    message: null,
    notice: null,
  } satisfies CancelState);

  return (
    <div className="flex flex-col gap-md">
      {state.message && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      {state.notice && (
        <Alert>
          <Clock aria-hidden="true" />
          <AlertDescription>{state.notice}</AlertDescription>
        </Alert>
      )}

      {invitations.length === 0 ? (
        <p className="text-body-md text-muted-foreground">
          No invitations are waiting. Anybody you invite appears here until they accept.
        </p>
      ) : (
        <ul className="flex flex-col gap-xs">
          {invitations.map((invitation) => (
            <li
              key={invitation.id}
              className="flex flex-wrap items-center justify-between gap-xs rounded-lg border border-border px-md py-sm"
            >
              <div className="flex min-w-0 flex-col gap-2xs">
                <span className="truncate font-mono text-body-sm">{invitation.email}</span>
                <span className="text-body-sm text-muted-foreground">
                  Invited by {invitation.invitedBy} ·{" "}
                  {invitation.expired ? (
                    // Derived, never stored: the row still says `pending`, and this is what that means
                    // once its date has passed. Inviting the address again supersedes it.
                    <span className="font-semibold">Expired</span>
                  ) : (
                    <span className="tabular-nums">Expires {formatDay(invitation.expiresAt)}</span>
                  )}
                </span>
              </div>

              <ConfirmAction
                trigger={
                  <Button variant="ghost" size="sm" aria-label={`Cancel the invitation to ${invitation.email}`}>
                    <X aria-hidden="true" />
                    Cancel
                  </Button>
                }
                title={projectMessages.cancelInvitationTitle}
                description={projectMessages.cancelInvitationDescription(invitation.email)}
                confirmLabel={projectMessages.cancelInvitationConfirm}
                action={formAction}
              >
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="invitationId" value={invitation.id} />
              </ConfirmAction>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
