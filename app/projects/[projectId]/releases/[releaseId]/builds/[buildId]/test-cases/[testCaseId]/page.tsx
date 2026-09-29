import { Pencil } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { getBuild } from "@/lib/builds/dal";
import { formatDay } from "@/lib/dates";
import { listProjectPeople, requireProjectMembership } from "@/lib/projects/dal";
import { nameForPerson } from "@/lib/projects/people";
import { getRelease } from "@/lib/releases/dal";
import { getTestCase } from "@/lib/test-cases/dal";
import { testCaseMessages } from "@/lib/test-cases/messages";

import { Chip } from "../../_components/status-chips";
import { DeleteTestCase } from "./delete-test-case";

/**
 * A Case, in full: everything it takes to run it, and — for any Member — the route to changing or
 * removing it.
 *
 * `getRelease` then `getBuild` run first, the same layering `getBuild`'s own comment describes: each
 * proves the next link in Project → Release → Build before `getTestCase` adds the last one, that this
 * Case belongs to this Build.
 */
export default async function TestCaseDetailsPage({
  params,
}: PageProps<"/projects/[projectId]/releases/[releaseId]/builds/[buildId]/test-cases/[testCaseId]">) {
  const { projectId, releaseId, buildId, testCaseId } = await params;
  await requireProjectMembership(projectId);
  const release = await getRelease(projectId, releaseId);
  const build = await getBuild(release.id, buildId);
  const testCase = await getTestCase(build.id, testCaseId);

  // The only door onto a Member's name from another Member's page — see `listProjectPeople`'s own
  // comment on why `project_people` is the one deliberate widening of the definer pattern.
  const people = await listProjectPeople(projectId);
  const nameFor = (userId: string) => nameForPerson(people, userId, testCaseMessages.personNoLongerInProject);

  const buildHref = `/projects/${projectId}/releases/${release.id}/builds/${build.id}`;

  return (
    <>
      <div className="flex flex-col gap-md border-b border-border pb-lg">
        <Link
          href={buildHref}
          className="font-mono text-body-sm text-muted-foreground hover:text-reference hover:underline"
        >
          Build {build.buildNumber}
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-md">
          <div className="flex flex-col gap-2xs">
            <span className="font-mono text-body-sm text-reference">{testCase.code}</span>
            <h1 className="font-heading text-headline-md font-semibold">{testCase.title}</h1>
          </div>

          <div className="flex items-center gap-xs">
            <Button asChild variant="secondary">
              <Link href={`${buildHref}/test-cases/${testCase.id}/edit`}>
                <Pencil aria-hidden="true" />
                Edit
              </Link>
            </Button>
            <DeleteTestCase
              projectId={projectId}
              releaseId={release.id}
              buildId={build.id}
              testCaseId={testCase.id}
              code={testCase.code}
            />
          </div>
        </div>

        <div className="flex items-center gap-xs">
          <Chip>{testCase.priority}</Chip>
          <Chip>{testCase.status}</Chip>
        </div>
      </div>

      {testCase.description && (
        <Section title="Description">
          <p className="whitespace-pre-wrap text-body-md text-muted-foreground">{testCase.description}</p>
        </Section>
      )}

      {testCase.preconditions && (
        <Section title="Preconditions">
          <p className="whitespace-pre-wrap text-body-md text-muted-foreground">
            {testCase.preconditions}
          </p>
        </Section>
      )}

      <Section title="Steps">
        {testCase.steps.length === 0 ? (
          <p className="text-body-md text-muted-foreground">No steps recorded.</p>
        ) : (
          <ol className="flex flex-col gap-sm">
            {testCase.steps.map((step, index) => (
              <li key={index} className="rounded-lg border border-border p-sm">
                <p className="text-label-sm uppercase text-muted-foreground">Step {index + 1}</p>
                <p className="whitespace-pre-wrap text-body-md">{step.action}</p>
                {step.expectedResult && (
                  <p className="whitespace-pre-wrap text-body-sm text-muted-foreground">
                    Expected: {step.expectedResult}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </Section>

      {testCase.expectedResult && (
        <Section title="Expected Result">
          <p className="whitespace-pre-wrap text-body-md text-muted-foreground">
            {testCase.expectedResult}
          </p>
        </Section>
      )}

      <p className="text-body-sm text-muted-foreground tabular-nums">
        Created by {nameFor(testCase.createdBy)} on {formatDay(testCase.createdAt)}. Last updated by{" "}
        {nameFor(testCase.updatedBy)} on {formatDay(testCase.updatedAt)}.
      </p>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-xs">
      <h2 className="font-heading text-title-lg">{title}</h2>
      {children}
    </div>
  );
}
