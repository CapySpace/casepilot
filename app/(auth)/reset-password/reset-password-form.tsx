"use client";

import { ArrowRight } from "lucide-react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";

import { FormAlert } from "@/components/form/fields";

import { PasswordField, PasswordRuleHint } from "../_components/fields";
import { resetPassword, type ResetPasswordState } from "./actions";

const initialState: ResetPasswordState = { errors: {}, message: null };

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(resetPassword, initialState);
  const [password, setPassword] = useState("");

  return (
    <form action={formAction} noValidate className="flex flex-col gap-md">
      <FormAlert message={state.message} />

      <PasswordField
        id="password"
        name="password"
        label="New password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={state.errors.password}
        aria-describedby="password-rule"
        hint={<PasswordRuleHint password={password} id="password-rule" />}
      />

      {/*
        Registration has no confirm field — the visibility toggle replaces it. Here it earns its
        place: this is a password the User has never typed before, so there is nothing to check it
        against from memory, and a typo they cannot see would lock them out of the very login they
        are in the middle of recovering.
      */}
      <PasswordField
        id="confirmation"
        name="confirmation"
        label="Confirm new password"
        autoComplete="new-password"
        error={state.errors.confirmation}
      />

      <Button type="submit" disabled={pending} className="h-11 w-full text-body-lg">
        {pending ? "Saving…" : "Set new password"}
        <ArrowRight aria-hidden="true" />
      </Button>
    </form>
  );
}
