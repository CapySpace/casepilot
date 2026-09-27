import { listMyProjects, requireProjectMembership } from "@/lib/projects/dal";

import { ProjectNav } from "./_components/project-nav";
import { ProjectSwitcher } from "./_components/project-switcher";

/**
 * The shell the design draws: a persistent sidebar beside the work.
 *
 * It lives here, inside a Project, rather than above `/projects` — its eyebrow, its switcher and its
 * navigation towards Releases and Builds are all about *a* Project, and rendering it over a list of
 * them would mean inventing an empty variant of every part.
 *
 * `requireProjectMembership` runs here as well as in each page, deliberately: the layout renders the
 * Project's name, so it reads Project data and must be guarded like anything else that does. It is
 * `cache`d, so the page beneath does not pay for a second query.
 *
 * Below the desktop breakpoint the sidebar sits above the content rather than sliding over it. The
 * design calls for a slide-over on tablet, which needs JavaScript and a dialog; stacking is the honest
 * version of it until something needs more.
 */
export default async function ProjectLayout({ children, params }: LayoutProps<"/projects/[projectId]">) {
  const { projectId } = await params;
  const [project, projects] = await Promise.all([
    requireProjectMembership(projectId),
    listMyProjects(),
  ]);

  return (
    <div className="flex flex-col gap-lg desktop:flex-row">
      {/*
        `rounded-2xl` because this is a panel, not a data card — DESIGN.md §5's radius table maps by
        what the element is. `desktop:` is the 1200px threshold §5 names, not Tailwind's `lg`, which
        would collapse the sidebar 176px early.
      */}
      <aside className="flex flex-col gap-lg rounded-2xl border border-border bg-card p-md shadow-level-1 desktop:w-sidebar desktop:shrink-0">
        <ProjectSwitcher current={project} projects={projects} />
        <ProjectNav projectId={project.id} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-lg">{children}</div>
    </div>
  );
}
