"use client";

import { Check } from "lucide-react";
import { useActionState } from "react";

import { FormAlert } from "@/components/form/fields";
import { Button } from "@/components/ui/button";

import { acceptInvitation, type AcceptState } from "./actions";

/**
 * The one control on this page, and it is a real form.
 *
 * Accepting is explicit — never something that happens because a page was opened. A mail client's link
 * scanner and a browser prefetch both follow links; neither presses buttons, and neither should be able to
 * join somebody to a Project.
 */
export function AcceptButton({ token, projectName }: { token: string; projectName: string }) {
  const [state, formAction, pending] = useActionState(acceptInvitation, {
    message: null,
  } satisfies AcceptState);

  return (
    <div className="flex flex-col gap-md">
      <FormAlert message={state.message} />

      <form action={formAction}>
        <input type="hidden" name="token" value={token} />
        <Button type="submit" disabled={pending} className="h-11 w-full text-body-lg">
          <Check aria-hidden="true" />
          {pending ? "Joining…" : `Join ${projectName}`}
        </Button>
      </form>
    </div>
  );
}
