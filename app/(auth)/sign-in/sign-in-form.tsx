"use client";

import { ArrowRight, Mail } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import { FormAlert, PasswordField, TextField } from "../_components/fields";
import { signIn } from "./actions";

export function SignInForm({ notice }: { notice: string | null }) {
  // Whatever brought them here starts in the same slot the action's own failures use, so there is
  // only ever one message on this form, and submitting replaces it rather than stacking.
  const [state, formAction, pending] = useActionState(signIn, { message: notice, email: "" });

  return (
    <form action={formAction} className="flex flex-col gap-md">
      <FormAlert message={state.message} />

      <TextField
        id="email"
        name="email"
        type="email"
        label="Work Email"
        icon={Mail}
        autoComplete="email"
        placeholder="name@company.com"
        defaultValue={state.email}
        required
      />

      <PasswordField
        id="password"
        name="password"
        autoComplete="current-password"
        required
        action={
          <Link href="/forgot-password" className="text-label-sm text-reference hover:underline">
            Forgot password?
          </Link>
        }
      />

      {/*
        The design drew a "Remember this device for 30 days" checkbox here. It is deliberately
        absent: session lifetime is uniform for everyone, taking the provider's defaults.
      */}

      <Button type="submit" disabled={pending} className="h-11 w-full text-body-lg">
        {pending ? "Signing in…" : "Sign In"}
        <ArrowRight aria-hidden="true" />
      </Button>
    </form>
  );
}
