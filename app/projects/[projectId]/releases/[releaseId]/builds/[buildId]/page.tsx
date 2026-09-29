import { ClipboardList } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getBuild } from "@/lib/builds/dal";
import { formatDay } from "@/lib/dates";
import { requireProjectMembership } from "@/lib/projects/dal";
import { getRelease } from "@/lib/releases/dal";
import { listTestCases, type TestCaseSummary } from "@/lib/test-cases/dal";

/**
 * A Build, on its own: its number and description in full, and the Cases recorded against it.
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
  const testCases = await listTestCases(build.id);

  const newTestCaseHref = `/projects/${projectId}/releases/${release.id}/builds/${build.id}/test-cases/new`;

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
      <p className="text-body-sm text-muted-foreground tabular-nums">Created {formatDay(build.createdAt)}</p>

      <div className="flex flex-col gap-md">
        <div className="flex flex-wrap items-center justify-between gap-md">
          <div className="flex items-center gap-xs">
            <h2 id="test-cases-heading" className="font-heading text-title-lg">
              Test Cases
            </h2>
            {testCases.length > 0 && (
              <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-body-sm tabular-nums text-muted-foreground">
                {testCases.length}
              </span>
            )}
          </div>
          {testCases.length > 0 && (
            <Button asChild variant="secondary">
              <Link href={newTestCaseHref}>
                <ClipboardList aria-hidden="true" />
                New Test Case
              </Link>
            </Button>
          )}
        </div>

        {testCases.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No test cases yet</CardTitle>
              <CardDescription>
                Test cases arrive by creating one — add the first thing to verify on this build.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="secondary">
                <Link href={newTestCaseHref}>
                  <ClipboardList aria-hidden="true" />
                  New Test Case
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ul aria-labelledby="test-cases-heading" className="flex flex-col gap-xs">
            {testCases.map((testCase) => (
              <li key={testCase.id}>
                <TestCaseRow testCase={testCase} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function TestCaseRow({ testCase }: { testCase: TestCaseSummary }) {
  return (
    <div className="flex flex-col gap-md rounded-xl border border-border bg-card p-md sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-sm">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
          <ClipboardList className="size-5" aria-hidden="true" />
        </span>

        <div className="flex min-w-0 flex-col gap-2xs">
          <span className="font-mono text-body-sm text-reference">{testCase.code}</span>
          <h3 className="text-title-md font-semibold">{testCase.title}</h3>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-xs">
        <Chip>{testCase.priority}</Chip>
        <Chip>{testCase.status}</Chip>
      </div>
    </div>
  );
}

function Chip({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-body-sm text-secondary-foreground">
      {children}
    </span>
  );
}
