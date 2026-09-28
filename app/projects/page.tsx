import { Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listMyProjects } from "@/lib/projects/dal";

import { ProjectList } from "./_components/project-list";

/**
 * Every Project the signed-in User belongs to, owned or joined, and nothing else.
 *
 * There is no filtering here and there must never be: row-level security decides what
 * `listMyProjects` can see, so a Project somebody else owns is absent rather than hidden. A page that
 * filters is a page that can forget to filter.
 *
 * The layout follows the Stitch "Project List" screen — a titled header with an active count, the
 * committing action opposite, a real search/filter toolbar, and a stack of low, wide rows. What that
 * screen shows and this one does not is everything the list still has no data for: release and build
 * counts, the last run's verdict, a project key, an author's avatar. Drawing them from nothing would be
 * the empty frame the spec forbids, so each row says what is true — who you are in it, how many people are
 * there, and when it started.
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
              <span className="rounded-full border border-border bg-secondary px-sm py-2xs text-body-sm tabular-nums text-secondary-foreground">
                {projects.length} active
              </span>
            )}
          </div>
          <p className="text-body-md text-muted-foreground">
            Manage the projects you own or have been invited to across your testing work.
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
