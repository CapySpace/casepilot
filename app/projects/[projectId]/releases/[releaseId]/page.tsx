import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProjectMembership } from "@/lib/projects/dal";
import { getRelease } from "@/lib/releases/dal";

import { ReleaseDetails } from "./release-details";

/**
 * A Release's own page: its details, in full, and any Member's route to changing them, plus the
 * Builds recorded under it.
 *
 * The Build list is real markup rather than the placeholder ticket 02 left — it is simply empty for
 * every Release this ticket touches, since Build creation does not exist until ticket 04. "0 builds" is
 * therefore not drawn as a stub to be replaced; it is the honest state of a Release nobody has added a
 * Build to yet, the same discipline the Project Overview and the Releases list already practise.
 */
export default async function ReleaseDetailsPage({
  params,
}: PageProps<"/projects/[projectId]/releases/[releaseId]">) {
  const { projectId, releaseId } = await params;
  await requireProjectMembership(projectId);
  const release = await getRelease(projectId, releaseId);

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

      <Card>
        <CardHeader>
          <CardTitle>No builds yet</CardTitle>
          <CardDescription>
            Builds arrive by creating one — add the first build produced under this release to start
            recording results against it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/*
            Disabled rather than absent: the spec is explicit that this is real markup and a real call
            to action, one that simply does nothing until ticket 04 wires up Build creation — not an
            invented "3 builds" or placeholder rows standing in for a feature that is not here.
          */}
          <Button disabled>
            <Plus aria-hidden="true" />
            Add Build
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
