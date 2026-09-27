import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { recoveringUser } from "@/lib/auth/dal";
import { authMessages } from "@/lib/auth/messages";

import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Choose a new password · CasePilot",
};

/**
 * Where a recovery link lands, by way of the confirmation endpoint.
 *
 * Verifying the recovery token signs the User in, so a session here is the evidence that they
 * opened the email. Arriving without one means the link was never followed, or had already been
 * used, or has run out — so this page says so and offers another, rather than presenting a form
 * that cannot work.
 *
 * An ordinary signed-in session is *not* enough, and the check is for a session that came from a
 * link rather than for any session at all. `secure_password_change` is off, so the provider would
 * happily let somebody already signed in set a new password without stating the old one — which
 * would turn borrowed access to an unlocked machine into permanent access. Recovery is for people
 * who cannot sign in; changing a password while signed in is a different feature, with its own
 * criteria, and Phase 1 does not have it.
 */
export default async function ResetPasswordPage() {
  const user = await recoveringUser();

  if (!user) {
    return (
      <div className="w-full rounded-2xl border border-border bg-card p-lg text-center shadow-level-1 sm:p-xl">
        <h1 className="text-headline-md">That link cannot be used</h1>
        <p className="mt-1.5 text-body-md text-muted-foreground">{authMessages.linkExpired}</p>
        <Button asChild className="mt-lg h-11 w-full text-body-lg">
          <Link href="/forgot-password">
            Request a new link
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-border bg-card p-lg shadow-level-1 sm:p-xl">
      <div className="mb-lg flex flex-col items-center text-center">
        <h1 className="text-headline-md">Choose a new password</h1>
        <p className="mt-1.5 text-body-md text-muted-foreground">
          You are setting a new password for{" "}
          <span className="font-mono text-foreground">{user.email}</span>.
        </p>
      </div>

      <ResetPasswordForm />
    </div>
  );
}
