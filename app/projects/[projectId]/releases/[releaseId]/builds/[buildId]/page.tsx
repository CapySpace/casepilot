import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBuild } from "@/lib/builds/dal";
import { formatDay } from "@/lib/dates";
import { requireProjectMembership } from "@/lib/projects/dal";
import { getRelease } from "@/lib/releases/dal";

/**
 * A Build, on its own: its number and description in full, and where it stands as of this phase —
 * created and viewable, never edited, with an honest word about what is not here yet.
 *
 * `getRelease` runs first, the same layering `getBuild`'s own comment describes: it is what proves
 * this Release belongs to this Project and the caller is a Member of it, before `getBuild` adds the
 * next link — that this Build belongs to this Release.
 */
export default async function BuildDetailsPage({
  params,
}: PageProps<"/projects/[projectId]/releases/[releaseId]/builds/[buildId]">) {
  const { projectId, releaseId, buildId } = await params;
  await requireProjectMembership(projectId);
  const release = await getRelease(projectId, releaseId);
  const build = await getBuild(release.id, buildId);

  return (
    <>
      <div className="flex flex-col gap-2xs border-b border-border pb-lg">
        <Link
          href={`/projects/${projectId}/releases/${release.id}`}
          className="font-mono text-body-sm text-muted-foreground hover:text-reference hover:underline"
        >
          {release.version}
        </Link>
        <h1 className="font-mono text-headline-md font-semibold text-reference">
          Build {build.buildNumber}
        </h1>
      </div>

      <p className="text-body-md text-muted-foreground">
        {build.description || "No description yet."}
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Test cases are not here yet</CardTitle>
          <CardDescription>
            Recording test cases and results against this build arrives in Phase 3.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-body-md text-muted-foreground">
          Created {formatDay(build.createdAt)}.
        </CardContent>
      </Card>
    </>
  );
}
