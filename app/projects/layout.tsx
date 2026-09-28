import Link from "next/link";

import { Wordmark } from "@/components/wordmark";
import { verifySession } from "@/lib/auth/dal";
import { AUTHENTICATED_HOME } from "@/lib/auth/routes";

import { SignOutButton } from "./_components/sign-out-button";

/**
 * The frame around the Projects list and the create form.
 *
 * Deliberately thin. The real shell — the sidebar with its Project switcher and its navigation
 * towards Releases and Builds — belongs inside a Project, where there is something for it to show,
 * and ticket 03 builds it in the `[projectId]` layout. What a User needs *here* is to know whose
 * session is active and to be able to end it, which on a shared machine is the whole of it.
 */
export default async function ProjectsLayout({ children }: LayoutProps<"/projects">) {
  const user = await verifySession();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-20 max-w-shell items-center justify-between gap-md px-md">
          <Link
            href={AUTHENTICATED_HOME}
            className="rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Wordmark />
          </Link>

          <div className="flex min-w-0 items-center gap-md">
            {/*
              Named at every width, not hidden on a phone. Phase 1's criterion is that whoever is
              signed in is obvious on a shared machine, and a shared machine is often a phone — so a
              long address truncates rather than disappearing.
            */}
            <span className="truncate font-mono text-body-sm text-muted-foreground">
              {user.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-shell flex-1 flex-col gap-lg px-md py-xl">
        {children}
      </main>
    </div>
  );
}
