import { ChevronsUpDown, FolderOpen } from "lucide-react";
import Link from "next/link";

import { Eyebrow } from "@/components/eyebrow";
import type { ProjectSummary } from "@/lib/projects/dal";

/**
 * Which Project you are in, and how to get to another.
 *
 * A native `<details>` rather than a dropdown component, so it opens with no JavaScript at all — the
 * property the authentication phase established for sign-out, kept here because the switcher is how
 * somebody gets *out* of a Project. It also costs no new dependency.
 *
 * The switcher is navigation and nothing else. There is no "current Project" stored anywhere: every
 * entry is a link to that Project's own URL, which is what makes two Projects in two tabs work.
 */
export function ProjectSwitcher({
  current,
  projects,
}: {
  current: { id: string; name: string };
  projects: ProjectSummary[];
}) {
  const others = projects.filter((project) => project.id !== current.id);

  return (
    <div>
      <Eyebrow className="px-sm pb-xs">Project</Eyebrow>

      <details className="rounded-lg [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-xs rounded-lg px-sm py-2 font-heading text-title-lg font-semibold hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          {/*
            Without this the control announces only the Project's name, which says what it shows and
            nothing about what it does. The eyebrow above says "Project" to a sighted reader; this says
            the rest to everybody.
          */}
          <span className="sr-only">Switch project, currently </span>
          <span className="min-w-0 flex-1 truncate">{current.name}</span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </summary>

        <ul className="mt-2xs flex flex-col gap-2xs border-t border-border pt-2xs">
          {others.map((project) => (
            <li key={project.id}>
              <Link
                href={`/projects/${project.id}`}
                className="flex items-center gap-xs rounded-lg px-sm py-1.5 text-body-md text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <FolderOpen className="size-4 text-muted-foreground" aria-hidden="true" />
                <span className="truncate">{project.name}</span>
              </Link>
            </li>
          ))}

          <li>
            <Link
              href="/projects"
              className="flex items-center gap-xs rounded-lg px-sm py-1.5 text-body-sm text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              All projects
            </Link>
          </li>
        </ul>
      </details>
    </div>
  );
}
