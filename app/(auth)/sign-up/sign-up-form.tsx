"use client";

import { ArrowRight, Mail, User } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import { FormAlert, TextField } from "@/components/form/fields";

import { PasswordField, PasswordRuleHint } from "../_components/fields";
import { signUp, type SignUpState } from "./actions";

const initialState: SignUpState = {
  errors: {},
  message: null,
  values: { fullName: "", email: "" },
};

export function SignUpForm({
  next,
  email,
}: {
  /** Where to land once the address is confirmed: an invitation, when that is what sent them here. */
  next?: string;
  /** The address an invitation was sent to, so somebody invited does not have to retype it. */
  email?: string;
}) {
  const [state, formAction, pending] = useActionState(signUp, initialState);
  const [password, setPassword] = useState("");

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

      {next && <input type="hidden" name="next" value={next} />}

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
        // The invited address on a first render, then whatever they typed if something was rejected.
        defaultValue={state.values.email || email || ""}
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
        hint={<PasswordRuleHint password={password} id="password-rule" />}
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

      <Button type="submit" disabled={pending} size="field" className="w-full">
        {pending ? "Creating…" : "Sign Up"}
        <ArrowRight aria-hidden="true" />
      </Button>
    </form>
  );
}
