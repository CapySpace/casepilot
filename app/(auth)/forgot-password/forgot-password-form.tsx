"use client";

import { ArrowLeft, ArrowRight, Mail, MailCheck } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import { authMessages } from "@/lib/auth/messages";

import { FormAlert, TextField } from "@/components/form/fields";
import { requestPasswordReset, type ForgotPasswordState } from "./actions";

const initialState: ForgotPasswordState = { sent: false, error: null, email: "" };

function BackToSignIn() {
  return (
    <Link
      href="/sign-in"
      className="inline-flex items-center gap-1.5 font-medium text-reference hover:underline"
    >
      <ArrowLeft className="size-3.5" aria-hidden="true" />
      Back to sign in
    </Link>
  );
}

/**
 * The whole card, not just the fields, because asking and being answered are two states of one
 * screen — the design swaps between them in place. Keeping the heading outside would leave "enter
 * your email address" sitting above a page with no email field on it.
 */
export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  if (state.sent) {
    return (
      <div className="flex flex-col items-center gap-md text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-secondary">
          <MailCheck className="size-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-headline-md">Instructions sent</h1>
          {/*
            Says nothing about whether the address is registered. That is the whole point of this
            screen: the same words appear either way, so nobody can use it to find out who has a
            login.
          */}
          <p className="mt-1.5 text-body-md text-muted-foreground">{authMessages.resetLinkSent}</p>
        </div>
        <div className="w-full border-t border-border pt-md text-body-sm">
          <BackToSignIn />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-lg flex flex-col items-center text-center">
        <h1 className="text-headline-md">Reset your password</h1>
        <p className="mt-1.5 text-body-md text-muted-foreground">
          Enter the email address you use for CasePilot and we will send you a link to choose a new
          password.
        </p>
      </div>

      <form action={formAction} noValidate className="flex flex-col gap-md">
        <FormAlert message={state.error} />

        <TextField
          id="email"
          name="email"
          type="email"
          label="Work Email"
          icon={Mail}
          autoComplete="email"
          placeholder="name@company.com"
          defaultValue={state.email}
          error={state.error ?? undefined}
        />

        <Button type="submit" disabled={pending} className="h-11 w-full text-body-lg">
          {pending ? "Sending…" : "Send reset link"}
          <ArrowRight aria-hidden="true" />
        </Button>
      </form>

      {/* A forgotten password should not be a dead end. */}
      <div className="mt-lg border-t border-border pt-md text-center text-body-sm">
        <BackToSignIn />
      </div>
    </>
  );
}
