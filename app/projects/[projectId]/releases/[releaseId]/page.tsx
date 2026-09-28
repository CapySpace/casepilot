import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDay } from "@/lib/dates";
import { requireProjectMembership } from "@/lib/projects/dal";
import { getRelease } from "@/lib/releases/dal";

/**
 * A Release, on its own: enough to prove it exists, and nothing more.
 *
 * The same deliberate-placeholder move Phase 1's ticket 02 made for `/projects/[projectId]/page.tsx`:
 * this is honest about what is not here yet rather than drawing an empty frame for it. Ticket 03
 * replaces this body with the Release's full details and its Build list.
 */
export default async function ReleaseDetailsPage({
  params,
}: PageProps<"/projects/[projectId]/releases/[releaseId]">) {
  const { projectId, releaseId } = await params;
  await requireProjectMembership(projectId);
  const release = await getRelease(projectId, releaseId);

  return (
    <>
      <div className="flex flex-col gap-2xs">
        <h1 className="font-mono text-headline-md font-semibold text-reference">
          {release.version}
        </h1>
        {release.name && <p className="text-title-lg text-muted-foreground">{release.name}</p>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Builds are not here yet</CardTitle>
          <CardDescription>
            Recording the builds produced under this release arrives next.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-body-md text-muted-foreground">
          Created {formatDay(release.createdAt)}.
        </CardContent>
      </Card>
    </>
  );
}
