"use client";

import type { ReactNode } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/**
 * A destructive action, behind a question.
 *
 * All three of the phase's destructive actions use this: leaving a Project, removing somebody from one, and
 * cancelling an Invitation. The confirming control is a real submit button inside a real form, so what
 * happens when it is pressed is a form post to a Server Action like any other.
 *
 * **This does need JavaScript**, and that is a deliberate step back from the property the authentication
 * phase established — sign-out is a plain form precisely so it works without the bundle. Opening a dialog
 * cannot be. The trade was recorded in the phase spec before any of it was built: the alternative was a
 * confirmation page per action, which is three more routes and a navigation for each, and `DESIGN.md`
 * specifies modals for exactly this. The mutation itself still degrades — it is a form post — but the
 * question in front of it does not appear at all without the bundle, and nothing is destroyed by accident
 * as a result.
 */
export function ConfirmAction({
  trigger,
  title,
  description,
  confirmLabel,
  children,
  action,
}: {
  /** The control that opens the question. */
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  /** Hidden fields the action needs — which Project, which Membership, which Invitation. */
  children?: ReactNode;
  action: (formData: FormData) => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>

        <form action={action}>
          {children}
          <AlertDialogFooter>
            {/* Cancel first in the markup, so it is what a keyboard reaches first: the safe answer to a
                question about losing access should not need an extra press to avoid. */}
            <AlertDialogCancel>Keep things as they are</AlertDialogCancel>
            <AlertDialogAction type="submit">{confirmLabel}</AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
