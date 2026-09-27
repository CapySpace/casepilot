import { Mail } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { authMessages } from "@/lib/auth/messages";

export const metadata: Metadata = {
  title: "Check your email · CasePilot",
};

/**
 * Where registration ends. Verification is mandatory, so a new User has no session yet and there is
 * nowhere else for them to go until they follow the link.
 *
 * The address arrives in the query string rather than in component state, so that reloading the
 * page — or coming back to it later from history — still says who the email went to. A refresh that
 * emptied this page would lose a User their place at exactly the moment they are least sure
 * anything happened.
 */
export default async function CheckEmailPage({
  searchParams,
}: PageProps<"/check-email">) {
  const { email } = await searchParams;
  const address = typeof email === "string" ? email : undefined;

  return (
    <div className="w-full rounded-2xl border border-border bg-card p-lg text-center shadow-level-1 sm:p-xl">
      <div className="mx-auto mb-md flex size-12 items-center justify-center rounded-xl bg-secondary">
        <Mail className="size-6 text-muted-foreground" aria-hidden="true" />
      </div>

      <h1 className="text-headline-md">Check your email</h1>

      {address ? (
        <p className="mt-1.5 text-body-md text-muted-foreground">
          Sent to <span className="font-mono text-foreground">{address}</span>.
        </p>
      ) : null}

      <p className="mt-1.5 text-body-md text-muted-foreground">{authMessages.confirmationSent}</p>

      <p className="mt-md text-body-sm text-muted-foreground">
        {authMessages.confirmBeforeSignIn}
      </p>

      <div className="mt-lg border-t border-border pt-md text-body-sm text-muted-foreground">
        Already confirmed?{" "}
        <Link href="/sign-in" className="font-medium text-reference hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
