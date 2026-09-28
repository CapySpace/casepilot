import type { Metadata } from "next";
import Link from "next/link";

import { safeNext } from "@/lib/auth/routes";

import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = {
  title: "Sign up · CasePilot",
};

export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  const { next, email } = await searchParams;
  // Both reduced before they reach the form: the destination to a path on this site, and the address to a
  // single string. Neither is trusted beyond being a default in a box the User can change.
  const destination = safeNext(typeof next === "string" ? next : null, "");
  const invited = typeof email === "string" ? email : undefined;

  return (
    <div className="w-full rounded-2xl border border-border bg-card p-lg shadow-level-1 sm:p-xl">
      <div className="mb-lg flex flex-col items-center text-center">
        {/*
          The design headed this "Create your CasePilot account" and closed it with "Already have an
          account?". Account is a retired term — it was doing three jobs at once, and is now User
          and Project — so the headings mirror the sign-in screen instead.
        */}
        <h1 className="text-headline-md">Sign up for CasePilot</h1>
        <p className="mt-1.5 text-body-md text-muted-foreground">
          Set up CasePilot in seconds. No credit card required.
        </p>
      </div>

      <SignUpForm next={destination || undefined} email={invited} />

      <div className="mt-lg border-t border-border pt-md text-center text-body-sm text-muted-foreground">
        Already using CasePilot?{" "}
        <Link
          href={destination ? `/sign-in?next=${encodeURIComponent(destination)}` : "/sign-in"}
          className="font-medium text-reference hover:underline"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
