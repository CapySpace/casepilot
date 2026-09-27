"use client";

import { Mail, UserPlus } from "lucide-react";
import { useActionState } from "react";

import { FormAlert, TextField } from "@/components/form/fields";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { validateInvitation } from "@/lib/projects/validation";

import { useMirroredFields } from "../../../_components/use-mirrored-fields";
import { inviteToProject, type InviteState } from "../actions";
import { InvitationLink } from "./invitation-link";

const initialState: InviteState = {
  errors: {},
  message: null,
  notice: null,
  invitationPath: null,
  email: "",
};

/**
 * Inviting a colleague, and the link that comes back.
 *
 * The state and the outcome live here; the field lives in a child that is **remounted** after each
 * successful invitation, keyed on the path of the link just issued. That is what empties the box without
 * writing to state from an effect — and keying on the token rather than on the wording of a message means
 * the reset cannot quietly stop working because a sentence was reworded.
 */
export function InviteForm({ projectId }: { projectId: string }) {
  const [state, formAction, pending] = useActionState(inviteToProject, initialState);

  return (
    <div className="flex flex-col gap-md">
      <FormAlert message={state.message} />

      {state.notice && (
        <Alert>
          <Mail aria-hidden="true" />
          <AlertDescription className="flex w-full flex-col gap-xs">
            {state.notice}
            {state.invitationPath && <InvitationLink path={state.invitationPath} />}
          </AlertDescription>
        </Alert>
      )}

      <InviteField
        key={state.invitationPath ?? "waiting"}
        projectId={projectId}
        formAction={formAction}
        pending={pending}
        email={state.email}
        serverErrors={state.errors}
      />
    </div>
  );
}

function InviteField({
  projectId,
  formAction,
  pending,
  email,
  serverErrors,
}: {
  projectId: string;
  formAction: (formData: FormData) => void;
  pending: boolean;
  email: string;
  serverErrors: InviteState["errors"];
}) {
  const field = useMirroredFields({ email }, validateInvitation, serverErrors);

  return (
    <form
      action={formAction}
      noValidate
      onSubmit={(event) => {
        // The browser's half of the refusal. The action runs the same rules regardless, because a Server
        // Action is reachable by a direct POST — and because this handler never runs without the bundle.
        if (!field.invalid) return;
        event.preventDefault();
        field.revealEverything();
      }}
      className="flex flex-col gap-md"
    >
      {/*
        Not bound into the action: a bound Server Action does not survive a submission with no client
        bundle (see the note in `[projectId]/settings/actions.ts`). The action re-checks ownership of
        whatever id arrives, so this is an argument, not a permission.
      */}
      <input type="hidden" name="projectId" value={projectId} />

      <TextField
        id="invitee"
        name="email"
        type="email"
        label="Email Address"
        icon={Mail}
        placeholder="colleague@company.com"
        autoComplete="off"
        defaultValue={email}
        {...field.fieldProps("email")}
        error={field.errors.email}
        hint="They will need a CasePilot account to accept — registering is part of the flow."
      />

      <div>
        <Button type="submit" disabled={pending}>
          <UserPlus aria-hidden="true" />
          {/*
            "Create", not "Send". ADR-0004 is explicit that the interface must not imply mail is on its
            way, and a paper-plane button beside copy saying CasePilot does not email it would do exactly
            that. The original brief drew "Send Invitation"; it drew it before the phase decided there
            would be no delivery.
          */}
          {pending ? "Creating…" : "Create Invitation"}
        </Button>
      </div>
    </form>
  );
}
