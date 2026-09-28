import { ChevronRight, Layers, Package, Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDay } from "@/lib/dates";
import { requireProjectMembership } from "@/lib/projects/dal";
import { listReleases, type ReleaseSummary } from "@/lib/releases/dal";

/**
 * Every Release belonging to this Project, with its Build count.
 *
 * There is no filtering here and there must never be: row-level security decides what `listReleases`
 * can see, so a Release belonging to a Project the User does not belong to is absent rather than
 * hidden — the same discipline `app/projects/page.tsx` states for itself.
 *
 * A Build count of zero for every row here is correct, not a bug to work around: Build creation does
 * not exist until ticket 04.
 */
export default async function ReleasesPage({
  params,
}: PageProps<"/projects/[projectId]/releases">) {
  const { projectId } = await params;
  const project = await requireProjectMembership(projectId);
  const releases = await listReleases(projectId);

  return (
    <>
      <div className="flex flex-col gap-md border-b border-border pb-lg sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2xs">
          <div className="flex items-center gap-xs">
            <h1 className="font-heading text-headline-md">Releases</h1>
            {releases.length > 0 && (
              <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-body-sm tabular-nums text-muted-foreground">
                {releases.length}
              </span>
            )}
          </div>
          <p className="text-body-md text-muted-foreground">
            Every version or milestone of {project.name} recorded here, and how many builds each holds.
          </p>
        </div>

        {releases.length > 0 && (
          <Button asChild>
            <Link href={`/projects/${projectId}/releases/new`}>
              <Plus aria-hidden="true" />
              New Release
            </Link>
          </Button>
        )}
      </div>

      {releases.length === 0 ? (
        <NoReleasesYet projectId={projectId} />
      ) : (
        <ReleaseList projectId={projectId} releases={releases} />
      )}
    </>
  );
}

function ReleaseList({
  projectId,
  releases,
}: {
  projectId: string;
  releases: ReleaseSummary[];
}) {
  return (
    <ul className="flex flex-col gap-xs">
      {releases.map((release) => (
        <li key={release.id}>
          <ReleaseRow projectId={projectId} release={release} />
        </li>
      ))}
    </ul>
  );
}

function ReleaseRow({ projectId, release }: { projectId: string; release: ReleaseSummary }) {
  return (
    // One link, stretched over the whole row by its own `after` layer — the same treatment
    // `app/projects/page.tsx`'s `ProjectRow` uses, and for the same reason.
    <div className="group relative flex flex-col gap-md rounded-xl border border-border bg-card p-md transition-colors hover:border-ring/60 hover:bg-accent/40 has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring/50 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-sm sm:items-center">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
          <Layers className="size-5" aria-hidden="true" />
        </span>

        <div className="flex min-w-0 flex-col gap-2xs">
          <div className="flex flex-wrap items-center gap-xs">
            {/*
              A version is an identifier per DESIGN.md §2 ("every identifier and link: case IDs,
              build versions") — Navigational Sapphire and monospace, not the Plus Jakarta Sans title
              treatment `ProjectRow` gives a Project's name. Release name stays subordinate: surfacing
              it more prominently is explicitly deferred, per the spec's Out of Scope section.
            */}
            <h2 className="font-mono text-title-lg font-semibold text-reference">
              <Link
                href={`/projects/${projectId}/releases/${release.id}`}
                className="after:absolute after:inset-0 focus-visible:outline-none"
              >
                {release.version}
              </Link>
            </h2>
            {release.name && (
              <span className="line-clamp-1 text-body-sm text-muted-foreground">{release.name}</span>
            )}
          </div>

          <span className="text-body-sm text-muted-foreground tabular-nums">
            Created {formatDay(release.createdAt)}
          </span>
        </div>
      </div>

      <span
        aria-hidden="true"
        className="flex shrink-0 items-center gap-sm text-body-sm font-medium text-muted-foreground transition-colors group-hover:text-reference"
      >
        <span className="flex items-center gap-2xs tabular-nums">
          <Package className="size-3.5" aria-hidden="true" />
          {release.buildCount} {release.buildCount === 1 ? "build" : "builds"}
        </span>
        <ChevronRight className="size-4" />
      </span>
    </div>
  );
}

function NoReleasesYet({ projectId }: { projectId: string }) {
  return (
    <Card className="max-w-reading">
      <CardHeader>
        <CardTitle>No releases yet</CardTitle>
        <CardDescription>
          Create a release to record the version or milestone you are testing, then add builds under
          it as they come out of CI.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link href={`/projects/${projectId}/releases/new`}>
            <Plus aria-hidden="true" />
            New Release
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
