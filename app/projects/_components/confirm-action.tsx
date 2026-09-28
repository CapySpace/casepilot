"use client";

import { useTransition, type ReactNode } from "react";

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
 * cancelling an Invitation.
 *
 * **It needs JavaScript, and there is no pretending otherwise.** A dialog cannot open without the client
 * bundle, so the question — and therefore the action behind it — is unreachable without one. That is the
 * trade the phase spec recorded before any of this was built: the alternative was a confirmation page per
 * action, three more routes and a navigation each, where `DESIGN.md` asks for modals. Nothing else in the
 * product depends on the bundle this way; sign-out, and every form, still post without it.
 *
 * The confirming button **dispatches the Server Action itself** rather than submitting a form inside the
 * dialog. The form version worked, but only by accident: the confirm button is Radix's close button, so the
 * dialog's content — including the form — unmounts inside the click handler, and the browser performs a
 * submission *after* that. It survived because the exit animation keeps the content mounted until
 * `animationend`. Deleting that class, or adding the `prefers-reduced-motion` reset this stylesheet does not
 * yet have, would have broken all three actions silently and with no error to find. Dispatching in the
 * handler does not care what unmounts next.
 */
export function ConfirmAction({
  trigger,
  title,
  description,
  confirmLabel,
  fields,
  action,
}: {
  /** The control that opens the question. */
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  /** What the action needs to know — which Project, which Membership, which Invitation. */
  fields: Record<string, string>;
  action: (formData: FormData) => void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>

        <AlertDialogFooter>
          {/*
            Radix moves focus to the cancel control when the dialog opens, whatever order these are written
            in — that is what makes the safe answer the one a keyboard has to leave, rather than the one it
            has to reach.
          */}
          <AlertDialogCancel>Keep things as they are</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={() => {
              const formData = new FormData();
              for (const [name, value] of Object.entries(fields)) formData.set(name, value);

              startTransition(() => action(formData));
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
