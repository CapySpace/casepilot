import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { safeNext } from "@/lib/auth/routes";
import mark from "@/public/brand/casepilot-mark.png";

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
        <div className="mb-sm flex size-12 items-center justify-center rounded-xl border border-border bg-secondary p-2 shadow-level-1">
          <Image src={mark} alt="" width={32} height={32} aria-hidden="true" />
        </div>
        <h1 className="text-headline-md">Create your CasePilot account</h1>
        <p className="mt-1.5 text-body-md text-muted-foreground">
          Start your workspace in seconds. No credit card required.
        </p>
      </div>

      <SignUpForm next={destination || undefined} email={invited} />

      <div className="mt-lg border-t border-border pt-md text-center text-body-sm text-muted-foreground">
        Already have an account?{" "}
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
