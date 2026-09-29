import { Wordmark } from "@/components/wordmark";
import { verifySession } from "@/lib/auth/dal";
import { listMyProjects, requireProjectMembership } from "@/lib/projects/dal";

import { SignOutButton } from "../_components/sign-out-button";
import { ProjectWorkspaceHeader } from "./_components/project-workspace-header";
import { ReleaseSearchProvider } from "./_components/release-search-context";
import { ProjectNav } from "./_components/project-nav";
import { ProjectSwitcher } from "./_components/project-switcher";

/**
 * The full-height project shell from the Stitch release reference.
 *
 * It lives here, inside a Project, rather than above `/projects` — its eyebrow, its switcher and its
 * navigation towards Releases and Builds are all about *a* Project, and rendering it over a list of
 * them would mean inventing an empty variant of every part.
 *
 * `requireProjectMembership` runs here as well as in each page, deliberately: the layout renders the
 * Project's name, so it reads Project data and must be guarded like anything else that does. It is
 * `cache`d, so the page beneath does not pay for a second query.
 *
 * On narrow screens the sidebar stacks above the workspace so its project navigation remains available.
 */
export default async function ProjectLayout({
  children,
  params,
}: LayoutProps<"/projects/[projectId]">) {
  const { projectId } = await params;
  const [project, projects, user] = await Promise.all([
    requireProjectMembership(projectId),
    listMyProjects(),
    verifySession(),
  ]);
  const initial = user.email[0]?.toLocaleUpperCase() ?? "U";

  return (
    <ReleaseSearchProvider>
      <div className="flex min-h-screen flex-col bg-background desktop:flex-row">
        {/* `desktop:` uses the 1200px threshold named in DESIGN.md §5. */}
        <aside className="flex shrink-0 flex-col justify-between border-b border-border bg-card desktop:min-h-screen desktop:w-sidebar desktop:border-b-0 desktop:border-r">
          <div className="flex flex-col gap-lg p-md">
            <div className="flex items-center justify-between gap-xs px-xs pb-xs">
              <Wordmark />
              <span className="shrink-0 rounded-md border border-border bg-secondary px-xs py-2xs text-body-sm text-muted-foreground">
                v0.1
              </span>
            </div>
            <ProjectSwitcher current={project} projects={projects} />
            <ProjectNav projectId={project.id} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-sm border-t border-border p-md">
            <div className="flex min-w-0 items-center gap-xs">
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary font-heading text-body-sm font-semibold text-secondary-foreground"
                aria-hidden="true"
              >
                {initial}
              </span>
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="text-body-sm font-semibold text-foreground">Signed in</span>
                <span className="max-w-40 truncate text-body-sm text-muted-foreground">
                  {user.email}
                </span>
              </span>
            </div>
            <SignOutButton />
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <ProjectWorkspaceHeader projectId={project.id} projectName={project.name} />
          <main className="flex min-w-0 flex-1 flex-col gap-lg px-lg py-xl desktop:px-xl">
            {children}
          </main>
        </div>
      </div>
    </ReleaseSearchProvider>
  );
}
