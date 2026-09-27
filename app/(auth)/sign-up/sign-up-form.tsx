"use client";

import { ArrowRight, Check, Mail, User } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PASSWORD_RULE } from "@/lib/auth/messages";
import { isPasswordValid } from "@/lib/auth/validation";

import { FormAlert, PasswordField, TextField } from "../_components/fields";
import { signUp, type SignUpState } from "./actions";

const initialState: SignUpState = {
  errors: {},
  message: null,
  values: { fullName: "", email: "" },
};

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUp, initialState);
  const [password, setPassword] = useState("");

  // Live, in the browser, with no round trip. The server runs the same rules again on submit.
  const passwordMeetsRule = isPasswordValid(password);

  return (
    /*
      `noValidate` turns off the browser's own constraint checking, deliberately. `type="email"`
      stays for the keyboard it brings up on a phone, but its native bubble would otherwise
      intercept a malformed address and say something in its own words and its own styling, while
      every other problem on this form is reported in ours. One voice is worth more than one round
      trip saved — and the server validates regardless, since it has to.
    */
    <form action={formAction} noValidate className="flex flex-col gap-md">
      <FormAlert message={state.message} />

      <TextField
        id="fullName"
        name="fullName"
        label="Full Name"
        icon={User}
        autoComplete="name"
        placeholder="e.g. Alexandra Vance"
        defaultValue={state.values.fullName}
        error={state.errors.fullName}
      />

      <TextField
        id="email"
        name="email"
        type="email"
        label="Work Email"
        icon={Mail}
        autoComplete="email"
        placeholder="name@company.com"
        defaultValue={state.values.email}
        error={state.errors.email}
      />

      <PasswordField
        id="password"
        name="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={state.errors.password}
        aria-describedby="password-rule"
        hint={
          /*
            The rule is stated before anything is submitted, and then answers as they type. It is
            one string shared with the server and with Supabase's own policy, so the rule a User is
            shown cannot drift from the rule that is enforced.
          */
          <p
            id="password-rule"
            aria-live="polite"
            className={`flex items-center gap-1.5 text-body-sm ${
              passwordMeetsRule ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {passwordMeetsRule ? (
              <>
                <Check className="size-3.5" aria-hidden="true" />
                Password meets the requirements
              </>
            ) : (
              PASSWORD_RULE
            )}
          </p>
        }
      />

      <div className="flex flex-col gap-2xs">
        <div className="flex items-start gap-xs">
          <Checkbox id="terms" name="terms" className="mt-0.5" />
          {/*
            One child, because Label lays its children out with `flex gap-2` — several would put a
            gap either side of each link and break the sentence up.
          */}
          <Label htmlFor="terms" className="text-body-sm leading-5 font-normal">
            <span>
              I agree to the{" "}
              <Link href="/terms" className="text-reference hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-reference hover:underline">
                Privacy Policy
              </Link>
            </span>
          </Label>
        </div>
        {state.errors.terms ? (
          <p className="text-body-sm text-destructive">{state.errors.terms}</p>
        ) : null}
      </div>

      <Button type="submit" disabled={pending} className="h-11 w-full text-body-lg">
        {pending ? "Creating…" : "Sign Up"}
        <ArrowRight aria-hidden="true" />
      </Button>
    </form>
  );
}
