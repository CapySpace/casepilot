"use client";

import { Save } from "lucide-react";
import { useActionState } from "react";

import type { TestCase } from "@/lib/test-cases/dal";

import { TestCaseForm } from "../../_components/test-case-form";
import { updateTestCase, type EditTestCaseState } from "../actions";

export function EditTestCaseForm({
  projectId,
  releaseId,
  buildId,
  testCase,
}: {
  projectId: string;
  releaseId: string;
  buildId: string;
  testCase: TestCase;
}) {
  const initialState: EditTestCaseState = {
    errors: {},
    message: null,
    values: {
      title: testCase.title,
      description: testCase.description ?? "",
      preconditions: testCase.preconditions ?? "",
      expectedResult: testCase.expectedResult ?? "",
    },
    priority: testCase.priority,
    status: testCase.status,
    steps: testCase.steps,
  };

  const [state, formAction, pending] = useActionState(updateTestCase, initialState);

  return (
    <TestCaseForm
      state={state}
      formAction={formAction}
      pending={pending}
      hiddenFields={{ projectId, releaseId, buildId, testCaseId: testCase.id }}
      submitIcon={Save}
      submitLabel="Save Changes"
      pendingLabel="Saving…"
      cancelHref={`/projects/${projectId}/releases/${releaseId}/builds/${buildId}/test-cases/${testCase.id}`}
    />
  );
}
