import { LogIn, Mail, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { currentUser } from "@/lib/auth/dal";
import { previewInvitation, type InvitationPreview } from "@/lib/projects/dal";
import { projectMessages } from "@/lib/projects/messages";

import { signOut } from "@/app/actions";

import { AcceptButton } from "./accept-button";

export const metadata: Metadata = {
  title: "Invitation · CasePilot",
};

/**
 * What somebody holding an invitation link sees.
 *
 * Public, because the person opening it may have no account at all — `lib/auth/routes.ts` admits this one
 * path by an anchored pattern, since the token makes it different every time. What it discloses is bounded
 * by holding the token: one Project's name, who invited them, and the address the email went to, which is
 * the address of whoever received it.
 *
 * Nothing here spends the token. Reading is a read; joining is a button.
 *
 * It lives in the `(auth)` group because that is where the frame it wants already is: a wordmark, a centred
 * card, and no sidebar — the shape of every page somebody sees before they are inside a Project. The group
 * is about pages that precede a session, not about authentication as a feature.
 */
export default async function InvitationPage({ params }: PageProps<"/invitations/[token]">) {
  const { token } = await params;
  const [invitation, user] = await Promise.all([previewInvitation(token), currentUser()]);

  return (
    <div className="w-full rounded-2xl border border-border bg-card p-lg shadow-level-1 sm:p-xl">
      {invitation === null ? (
        <Outcome title="Invitation" body={projectMessages.invitationNotFound} />
      ) : (
        <Invitation invitation={invitation} token={token} signedInAs={user?.email ?? null} />
      )}
    </div>
  );
}

function Invitation({
  invitation,
  token,
  signedInAs,
}: {
  invitation: InvitationPreview;
  token: string;
  signedInAs: string | null;
}) {
  const { projectName, invitedBy, email, state } = invitation;

  if (state === "expired") {
    return <Outcome title={projectName} body={projectMessages.invitationExpired} />;
  }

  if (state === "cancelled") {
    return <Outcome title={projectName} body={projectMessages.invitationCancelledNotice} />;
  }

  if (state === "accepted") {
    return <Outcome title={projectName} body={projectMessages.invitationAlreadyUsed} />;
  }

  const destination = `/invitations/${token}`;

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-col items-center gap-2xs text-center">
        <p className="text-label-sm uppercase text-muted-foreground">You have been invited to join</p>
        <h1 className="font-heading text-headline-md">{projectName}</h1>
        <p className="text-body-md text-muted-foreground">
          {invitedBy} invited <span className="font-mono">{email}</span>
        </p>
      </div>

      {signedInAs === null ? (
        <div className="flex flex-col gap-xs">
          {/*
            Two routes, because an invited colleague may or may not have used CasePilot before, and the
            page cannot tell which. Both carry the invitation, so neither is a dead end: registering comes
            back here after the address is confirmed, and signing in comes straight back.
          */}
          <Button asChild className="h-11 w-full text-body-lg">
            <Link
              href={`/sign-up?next=${encodeURIComponent(destination)}&email=${encodeURIComponent(email)}`}
            >
              <UserPlus aria-hidden="true" />
              Create an account
            </Link>
          </Button>
          <Button asChild variant="secondary" className="h-11 w-full text-body-lg">
            <Link href={`/sign-in?next=${encodeURIComponent(destination)}`}>
              <LogIn aria-hidden="true" />
              Sign in
            </Link>
          </Button>
          <p className="text-center text-body-sm text-muted-foreground">
            Accepting adds you to this project. You will be asked to confirm your email address first.
          </p>
        </div>
      ) : signedInAs.toLowerCase() !== email.toLowerCase() ? (
        <div className="flex flex-col gap-md">
          <Alert variant="destructive">
            <Mail aria-hidden="true" />
            <AlertDescription>
              {projectMessages.invitationForSomebodyElse(email, signedInAs)}
            </AlertDescription>
          </Alert>

          {/*
            A way out, not just a refusal. Signing out from here comes back to this page's sign-in, so the
            right person can take over without hunting for the link again.
          */}
          <form action={signOut}>
            <input
              type="hidden"
              name="next"
              value={`/sign-in?next=${encodeURIComponent(destination)}`}
            />
            <Button type="submit" variant="secondary" className="h-11 w-full text-body-lg">
              Sign out and sign in as {email}
            </Button>
          </form>
        </div>
      ) : (
        <AcceptButton token={token} projectName={projectName} />
      )}
    </div>
  );
}

function Outcome({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-col items-center gap-2xs text-center">
        <h1 className="font-heading text-headline-md">{title}</h1>
        <p className="text-body-md text-muted-foreground">{body}</p>
      </div>

      <Button asChild variant="secondary" className="h-11 w-full text-body-lg">
        <Link href="/projects">Go to my projects</Link>
      </Button>
    </div>
  );
}
