import { ChevronRight, Package } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listBuilds, type BuildSummary } from "@/lib/builds/dal";
import { formatDay } from "@/lib/dates";
import { requireProjectMembership } from "@/lib/projects/dal";
import { getRelease } from "@/lib/releases/dal";

import { AddBuildForm } from "./add-build-form";
import { ReleaseDetails } from "./release-details";

/**
 * A Release's own page: its details, in full, and any Member's route to changing them, plus the
 * Builds recorded under it and any Member's route to adding one.
 *
 * "No builds yet" is not a stub waiting on a later ticket, the way it was in ticket 03 — Build
 * creation is real from here on, so an empty list is simply what a Release nobody has recorded a
 * Build against looks like, the same discipline the Project Overview and Release Details already
 * practise.
 */
export default async function ReleaseDetailsPage({
  params,
}: PageProps<"/projects/[projectId]/releases/[releaseId]">) {
  const { projectId, releaseId } = await params;
  await requireProjectMembership(projectId);
  const release = await getRelease(projectId, releaseId);
  const builds = await listBuilds(release.id);

  return (
    <>
      <ReleaseDetails
        projectId={projectId}
        releaseId={release.id}
        saved={{
          version: release.version,
          name: release.name ?? "",
          description: release.description ?? "",
        }}
      />

      <div className="flex flex-col gap-md">
        <div className="flex flex-wrap items-center justify-between gap-md">
          <div className="flex items-center gap-xs">
            <h2 id="builds-heading" className="font-heading text-title-lg">
              Builds
            </h2>
            {builds.length > 0 && (
              <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-body-sm tabular-nums text-muted-foreground">
                {builds.length}
              </span>
            )}
          </div>
          {builds.length > 0 && <AddBuildForm projectId={projectId} releaseId={release.id} />}
        </div>

        {builds.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No builds yet</CardTitle>
              <CardDescription>
                Builds arrive by creating one — add the first build produced under this release to
                start recording results against it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AddBuildForm projectId={projectId} releaseId={release.id} />
            </CardContent>
          </Card>
        ) : (
          <ul aria-labelledby="builds-heading" className="flex flex-col gap-xs">
            {builds.map((build) => (
              <li key={build.id}>
                <BuildRow projectId={projectId} releaseId={release.id} build={build} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function BuildRow({
  projectId,
  releaseId,
  build,
}: {
  projectId: string;
  releaseId: string;
  build: BuildSummary;
}) {
  return (
    // One link, stretched over the whole row by its own `after` layer — the same treatment
    // `app/projects/[projectId]/releases/page.tsx`'s `ReleaseRow` uses, and for the same reason.
    <div className="group relative flex flex-col gap-md rounded-xl border border-border bg-card p-md transition-colors hover:border-ring/60 hover:bg-accent/40 has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring/50 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-sm">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
          <Package className="size-5" aria-hidden="true" />
        </span>

        <div className="flex min-w-0 flex-col gap-2xs">
          <h3 className="font-mono text-title-md font-semibold text-reference">
            <Link
              href={`/projects/${projectId}/releases/${releaseId}/builds/${build.id}`}
              className="after:absolute after:inset-0 focus-visible:outline-none"
            >
              Build {build.buildNumber}
            </Link>
          </h3>
          <span className="text-body-sm text-muted-foreground tabular-nums">
            Created {formatDay(build.createdAt)}
          </span>
        </div>
      </div>

      <ChevronRight
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-reference"
      />
    </div>
  );
}
