import { Plus, Users } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listMyProjects, type ProjectSummary } from "@/lib/projects/dal";

import { RoleLabel } from "./_components/role-label";

/**
 * Every Project the signed-in User belongs to, owned or joined, and nothing else.
 *
 * There is no filtering here and there must never be: row-level security decides what
 * `listMyProjects` can see, so a Project somebody else owns is absent rather than hidden. A page that
 * filters is a page that can forget to filter.
 */
export default async function ProjectsPage() {
  const projects = await listMyProjects();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-md">
        <h1 className="font-heading text-headline-md">My Projects</h1>

        {projects.length > 0 && (
          <Button asChild>
            <Link href="/projects/new">
              <Plus aria-hidden="true" />
              Create Project
            </Link>
          </Button>
        )}
      </div>

      {projects.length === 0 ? <NoProjectsYet /> : <ProjectList projects={projects} />}
    </>
  );
}

function ProjectList({ projects }: { projects: ProjectSummary[] }) {
  return (
    <ul className="flex flex-col gap-md">
      {projects.map((project) => (
        <li key={project.id}>
          <ProjectRow project={project} />
        </li>
      ))}
    </ul>
  );
}

function ProjectRow({ project }: { project: ProjectSummary }) {
  return (
    /*
      One link, stretched over the whole card by its own `after` layer, rather than a link wrapped
      around the card's insides. Three things come out right that way: the accessible name of the link
      is the Project's name alone rather than the name, description, Role and count read as one
      phrase; `CardHeader` and `CardContent` stay direct children of `Card`, so the 24px interior
      rhythm the design specifies still applies; and the focus ring is drawn on the card itself, which
      matters because `Card` sets `overflow-hidden` and would clip a ring drawn inside it.

      The hover tint is Selected Row Ice (`--accent`), which DESIGN.md §4 names for exactly this. The
      obvious `hover:border-ring` would have been Signal Emerald — the *Passed* marker — spent on
      decoration, which is the one thing the colour discipline forbids.
    */
    <Card className="relative gap-md transition-colors hover:bg-accent has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring/50">
      <CardHeader className="gap-2xs">
        <h2 className="font-heading text-title-lg font-semibold">
          <Link
            href={`/projects/${project.id}`}
            className="after:absolute after:inset-0 focus-visible:outline-none"
          >
            {project.name}
          </Link>
        </h2>
        {project.description && (
          <CardDescription className="line-clamp-2">{project.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-md text-body-sm text-muted-foreground">
        <RoleLabel role={project.role} />
        <span className="flex items-center gap-2xs">
          <Users className="size-3.5" aria-hidden="true" />
          <span className="tabular-nums">
            {project.memberCount} {project.memberCount === 1 ? "member" : "members"}
          </span>
        </span>
      </CardContent>
    </Card>
  );
}

function NoProjectsYet() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>You are not in any projects yet</CardTitle>
        <CardDescription>
          A project is where a team&rsquo;s test cases, builds and results live. Create one, or wait
          for a colleague to invite you to theirs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link href="/projects/new">
            <Plus aria-hidden="true" />
            Create Project
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
