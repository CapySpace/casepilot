import { ArrowRight, FolderKanban, Plus, Users } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDay } from "@/lib/dates";
import { listMyProjects, type ProjectSummary } from "@/lib/projects/dal";

import { RoleLabel } from "./_components/role-label";

/**
 * Every Project the signed-in User belongs to, owned or joined, and nothing else.
 *
 * There is no filtering here and there must never be: row-level security decides what
 * `listMyProjects` can see, so a Project somebody else owns is absent rather than hidden. A page that
 * filters is a page that can forget to filter.
 *
 * The layout follows the Stitch "Project List" screen — a titled header with a count beside it and the
 * committing action opposite, over a stack of low, wide rows. What that screen shows and this one does not
 * is everything Phase 1 has no data for: test-case, release and build counts, the last run's verdict, a
 * project key, an author's avatar. Drawing them from nothing would be the empty frame the spec forbids, so
 * each row says what is true — who you are in it, how many people are there, and when it started.
 */
export default async function ProjectsPage() {
  const projects = await listMyProjects();

  return (
    <>
      <div className="flex flex-col gap-md border-b border-border pb-lg sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2xs">
          <div className="flex items-center gap-xs">
            <h1 className="font-heading text-headline-md">Projects</h1>
            {projects.length > 0 && (
              <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-body-sm tabular-nums text-muted-foreground">
                {projects.length}
              </span>
            )}
          </div>
          <p className="text-body-md text-muted-foreground">
            {/* The reference promises test suites, pipelines and release quality. This says what a
                project holds today, which is its people. */}
            Every project you own or have been invited to.
          </p>
        </div>

        {projects.length > 0 && (
          <Button asChild>
            <Link href="/projects/new">
              <Plus aria-hidden="true" />
              New Project
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
    <ul className="flex flex-col gap-xs">
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
      One link, stretched over the whole row by its own `after` layer. The reference draws a separate
      "Open" button and a row that is not itself a target; one target is better, and it keeps the link's
      accessible name to the Project's name rather than the whole row read as a sentence. The affordance on
      the right is therefore `aria-hidden`: it shows where the row goes without being a second thing to tab
      to and announce.
    */
    <div className="group relative flex flex-col gap-md rounded-xl border border-border bg-card p-md transition-colors hover:border-ring/60 hover:bg-accent/40 has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring/50 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-sm sm:items-center">
        {/*
          One tile, one tint, for every Project. The reference gives each row its own colour — emerald here,
          blue there — and DESIGN.md's discipline is that colour carries status and nothing else, so a
          per-project tint would be five verdicts about nothing.
        */}
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
          <FolderKanban className="size-5" aria-hidden="true" />
        </span>

        <div className="flex min-w-0 flex-col gap-2xs">
          <div className="flex flex-wrap items-center gap-xs">
            <h2 className="text-title-lg font-semibold">
              <Link
                href={`/projects/${project.id}`}
                className="after:absolute after:inset-0 focus-visible:outline-none group-hover:text-reference"
              >
                {project.name}
              </Link>
            </h2>
            <RoleLabel role={project.role} />
          </div>

          {project.description && (
            <p className="line-clamp-1 text-body-sm text-muted-foreground">{project.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-x-sm gap-y-2xs text-body-sm text-muted-foreground">
            <span className="flex items-center gap-2xs">
              <Users className="size-3.5" aria-hidden="true" />
              <span className="tabular-nums">
                {project.memberCount} {project.memberCount === 1 ? "member" : "members"}
              </span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">Started {formatDay(project.createdAt)}</span>
          </div>
        </div>
      </div>

      <span
        aria-hidden="true"
        className="flex shrink-0 items-center gap-2xs text-body-sm font-medium text-muted-foreground transition-colors group-hover:text-reference"
      >
        Open
        <ArrowRight className="size-4" />
      </span>
    </div>
  );
}

function NoProjectsYet() {
  return (
    <Card className="max-w-reading">
      <CardHeader>
        <CardTitle>You are not in any projects yet</CardTitle>
        <CardDescription>
          A project is where a team&rsquo;s test cases, builds and results live. Create one, or wait for a
          colleague to invite you to theirs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link href="/projects/new">
            <Plus aria-hidden="true" />
            New Project
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
