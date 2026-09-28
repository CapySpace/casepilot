import { Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProjectMembership } from "@/lib/projects/dal";
import { listReleases } from "@/lib/releases/dal";

import { ReleaseList } from "./release-list";

/**
 * Every Release belonging to this Project, with its Build count.
 *
 * There is no filtering here and there must never be: row-level security decides what `listReleases`
 * can see, so a Release belonging to a Project the User does not belong to is absent rather than
 * hidden — the same discipline `app/projects/page.tsx` states for itself.
 *
 * The Stitch reference also shows author names. This product does not store a Release author yet, so the
 * list shows the version, name, description, creation date and real Build count only.
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
          <p className="text-body-sm text-muted-foreground">
            <Link href={`/projects/${projectId}`} className="hover:text-foreground">
              {project.name}
            </Link>{" "}
            / <span className="text-foreground">Releases</span>
          </p>
          <div className="flex items-center gap-xs">
            <h1 className="font-heading text-headline-md">Releases</h1>
            {releases.length > 0 && (
              <span className="rounded-full border border-border bg-secondary px-sm py-2xs text-body-sm tabular-nums text-secondary-foreground">
                {releases.length} {releases.length === 1 ? "release" : "releases"}
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
