import type { ReactNode } from "react";

import { Bell, Settings } from "lucide-react";
import Link from "next/link";

import { Wordmark } from "@/components/wordmark";
import { verifySession } from "@/lib/auth/dal";
import { AUTHENTICATED_HOME } from "@/lib/auth/routes";

import { ProjectsFrame } from "./_components/projects-frame";
import { SignOutButton } from "./_components/sign-out-button";

/**
 * The frame around the Projects list and the create form.
 *
 * Deliberately thin. The real shell — the sidebar with its Project switcher and its navigation towards
 * Releases and Builds — belongs inside a Project, where there is something for it to show, and lives in the
 * `[projectId]` layout. What a User needs *here* is to know whose session is active and to be able to end
 * it, which on a shared machine is the whole of it — and, from the Stitch reference, a footer to close the
 * page on.
 */
export default async function ProjectsLayout({ children }: LayoutProps<"/projects">) {
  const user = await verifySession();
  const initial = user.email[0]?.toLocaleUpperCase() ?? "U";

  return (
    <ProjectsFrame
      projectsFrame={
        <ProjectsPageFrame email={user.email} initial={initial}>
          {children}
        </ProjectsPageFrame>
      }
    >
      {children}
    </ProjectsFrame>
  );
}

function ProjectsPageFrame({
  children,
  email,
  initial,
}: {
  children: ReactNode;
  email: string;
  initial: string;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-shell items-center justify-between gap-md px-md">
          <Link
            href={AUTHENTICATED_HOME}
            className="rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Wordmark />
          </Link>

          <div className="flex min-w-0 items-center gap-md">
            <div className="hidden items-center gap-xs text-muted-foreground sm:flex" aria-hidden="true">
              <span className="flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-muted">
                <Bell className="size-4" />
              </span>
              <span className="flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-muted">
                <Settings className="size-4" />
              </span>
            </div>

            {/*
              Named at every width, not hidden on a phone. Phase 1's criterion is that whoever is
              signed in is obvious on a shared machine, and a shared machine is often a phone — so a
              long address truncates rather than disappearing.
            */}
            <div className="flex min-w-0 items-center gap-xs">
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary font-heading text-body-md font-semibold text-secondary-foreground"
                aria-hidden="true"
              >
                {initial}
              </span>
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="text-body-sm font-semibold text-foreground">Signed in</span>
                <span className="truncate font-mono text-body-sm text-muted-foreground">
                  {email}
                </span>
              </span>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-shell flex-1 flex-col gap-lg px-md py-lg">
        {children}
      </main>

      {/*
        The Stitch Project List screen closes on a footer: the wordmark, a copyright, and a few links on the
        right. Its three — Documentation, API Status, Compliance — go nowhere in this product, and a link
        that goes nowhere is the empty frame the phase spec refuses, so the two pages that do exist take
        their place. The copyright matches the one the signed-out frame already shows, rather than being a
        second opinion about who owns this.
      */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-shell flex-col items-center justify-between gap-xs px-md py-md text-body-sm text-muted-foreground sm:flex-row">
          <p className="flex items-center gap-xs">
            <span className="font-medium text-foreground">CasePilot</span>
            <span aria-hidden="true">·</span>
            <span>© {new Date().getFullYear()} CasePilot Technologies Inc.</span>
          </p>

          <nav aria-label="Legal" className="flex items-center gap-md">
            <Link href="/terms" className="hover:text-foreground">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy Policy
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
