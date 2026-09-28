import type { Metadata } from "next";
import Link from "next/link";

import { safeNext } from "@/lib/auth/confirmation";
import { messageForNotice } from "@/lib/auth/messages";

import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "Sign in · CasePilot",
};

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  // Set by the confirmation endpoint when a link could not be used. It carries a key, not a
  // message, so the only words that can appear here are CasePilot's own.
  const { error, next } = await searchParams;
  const notice = messageForNotice(error);
  // Reduced to a path on this site before it reaches the form, so a link written by anybody cannot make
  // signing in bounce somewhere else.
  const destination = safeNext(typeof next === "string" ? next : null, "");

  return (
    <div className="w-full rounded-2xl border border-border bg-card p-lg shadow-level-1 sm:p-xl">
      {/*
        The design draws a brand-gradient accent strip across the top of this card. It is not here:
        DESIGN.md §2 reserves Signal Emerald for the logo mark, the Passed dot and the passing
        progress segment, and states the system's central discipline as "colour means status, and
        status alone". A decorative strip is exactly what that rule exists to stop. §4's card
        treatment — hairline border, Level 1 shadow — is what a card gets instead.
      */}
      <div className="mb-lg flex flex-col items-center text-center">
        <h1 className="text-headline-md">Sign in to CasePilot</h1>
        <p className="mt-1.5 text-body-md text-muted-foreground">
          Enter your credentials to access your Projects
        </p>
      </div>

      {/*
        Keyed on the notice: `useActionState` reads its initial state only when it mounts, so a
        client-side navigation that changes `?error=` would otherwise leave the previous message
        showing.
      */}
      <SignInForm key={notice ?? "none"} notice={notice} next={destination || undefined} />

      <div className="mt-lg border-t border-border pt-md text-center text-body-sm text-muted-foreground">
        New to CasePilot?{" "}
        <Link
          href={destination ? `/sign-up?next=${encodeURIComponent(destination)}` : "/sign-up"}
          className="font-medium text-reference hover:underline"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
