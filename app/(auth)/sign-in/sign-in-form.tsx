"use client";

import { ArrowRight, Eye, EyeOff, Lock, Mail, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { signIn, type SignInState } from "./actions";

const initialState: SignInState = { message: null, email: "" };

const fieldClasses = "h-11 rounded-lg pl-10 text-body-md";
const iconClasses =
  "pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground";

export function SignInForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const [revealed, setRevealed] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-md">
      {state.message ? (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-2xs">
        <Label htmlFor="email" className="text-label-md">
          Work Email
        </Label>
        <div className="relative">
          <span className={iconClasses}>
            <Mail className="size-5" aria-hidden="true" />
          </span>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@company.com"
            defaultValue={state.email}
            required
            className={fieldClasses}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2xs">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-label-md">
            Password
          </Label>
          <Link
            href="/forgot-password"
            className="text-label-sm text-reference hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <span className={iconClasses}>
            <Lock className="size-5" aria-hidden="true" />
          </span>
          <Input
            id="password"
            name="password"
            type={revealed ? "text" : "password"}
            autoComplete="current-password"
            required
            className={`${fieldClasses} pr-10`}
          />
          {/*
            The visibility toggle is the reason there is no confirm-password field anywhere in
            CasePilot: seeing what you typed does the same job without the second box.
          */}
          <button
            type="button"
            onClick={() => setRevealed((shown) => !shown)}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            className="absolute inset-y-0 right-0 flex items-center rounded-r-lg pr-3 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {revealed ? (
              <EyeOff className="size-5" aria-hidden="true" />
            ) : (
              <Eye className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

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
