import Link from "next/link";
import type { ReactNode } from "react";

import { getBuild } from "@/lib/builds/dal";
import { formatDay } from "@/lib/dates";
import { listProjectPeople, requireProjectMembership } from "@/lib/projects/dal";
import { nameForPerson } from "@/lib/projects/people";
import { getRelease } from "@/lib/releases/dal";
import { getTestAttempt, type TestResultDetail } from "@/lib/test-attempts/dal";
import { testResultMessages } from "@/lib/test-attempts/messages";

import { AttemptStatusChip, OutcomeChip } from "../../../_components/status-chips";

/**
 * The Testing Execution Page — read-only in this ticket, since recording a Result is ticket 03's own
 * work. Every Case in the Attempt is shown with its frozen snapshot and its current Outcome, which is
 * `Not Run` for all of them the moment an Attempt starts and stays that way until ticket 03 gives a
 * Member something to change it with.
 *
 * `getRelease` then `getBuild` run first, the same layering every other page under `[buildId]` uses,
 * before `getTestAttempt` adds the last link: that this Attempt belongs to this Build.
 */
export default async function TestAttemptExecutionPage({
  params,
}: PageProps<"/projects/[projectId]/releases/[releaseId]/builds/[buildId]/attempts/[attemptId]/execute">) {
  const { projectId, releaseId, buildId, attemptId } = await params;
  await requireProjectMembership(projectId);
  const release = await getRelease(projectId, releaseId);
  const build = await getBuild(release.id, buildId);
  const attempt = await getTestAttempt(build.id, attemptId);

  const people = await listProjectPeople(projectId);
  const nameFor = (userId: string) => nameForPerson(people, userId, testResultMessages.personNoLongerInProject);

  const buildHref = `/projects/${projectId}/releases/${release.id}/builds/${build.id}`;
  const tested = attempt.results.filter((result) => result.outcome !== "Not Run").length;

  return (
    <>
      <div className="flex flex-col gap-md border-b border-border pb-lg">
        <Link
          href={buildHref}
          className="font-mono text-body-sm text-muted-foreground hover:text-reference hover:underline"
        >
          Build {build.buildNumber}
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-md">
          <h1 className="font-heading text-headline-md font-semibold">
            {testResultMessages.attemptLabel(attempt.attemptNumber)}
          </h1>
          <AttemptStatusChip status={attempt.status} />
        </div>

        <p className="text-body-sm text-muted-foreground tabular-nums">
          Started by {nameFor(attempt.createdBy)} on {formatDay(attempt.startedAt)}
        </p>

        <p className="text-body-md tabular-nums">
          Tested: {tested} / {attempt.results.length}
        </p>
      </div>

      {attempt.results.length === 0 ? (
        <p className="text-body-md text-muted-foreground">This Attempt has no Cases recorded against it.</p>
      ) : (
        <ol className="flex flex-col gap-md">
          {attempt.results.map((result) => (
            <li key={result.id}>
              <ResultCard result={result} />
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

function ResultCard({ result }: { result: TestResultDetail }) {
  return (
    <div className="flex flex-col gap-md rounded-xl border border-border bg-card p-lg">
      <div className="flex flex-wrap items-start justify-between gap-md">
        <div className="flex flex-col gap-2xs">
          <span className="font-mono text-body-sm text-reference">{result.testCaseCode}</span>
          <h2 className="text-title-lg font-semibold">{result.titleSnapshot}</h2>
        </div>
        <OutcomeChip outcome={result.outcome} />
      </div>

      {result.descriptionSnapshot && (
        <Section title="Description">
          <p className="whitespace-pre-wrap text-body-md text-muted-foreground">
            {result.descriptionSnapshot}
          </p>
        </Section>
      )}

      {result.preconditionsSnapshot && (
        <Section title="Preconditions">
          <p className="whitespace-pre-wrap text-body-md text-muted-foreground">
            {result.preconditionsSnapshot}
          </p>
        </Section>
      )}

      {result.stepsSnapshot.length > 0 && (
        <Section title="Steps">
          <ol className="flex flex-col gap-sm">
            {result.stepsSnapshot.map((step, index) => (
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
        </Section>
      )}

      {result.expectedResultSnapshot && (
        <Section title="Expected Result">
          <p className="whitespace-pre-wrap text-body-md text-muted-foreground">
            {result.expectedResultSnapshot}
          </p>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-xs">
      <h3 className="font-heading text-title-md">{title}</h3>
      {children}
    </div>
  );
}
