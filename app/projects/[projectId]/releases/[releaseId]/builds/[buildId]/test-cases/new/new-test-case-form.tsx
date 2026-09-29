"use client";

import { Plus } from "lucide-react";
import { useActionState } from "react";

import { DEFAULT_TEST_CASE_PRIORITY, DEFAULT_TEST_CASE_STATUS } from "@/lib/test-cases/validation";

import { TestCaseForm } from "../_components/test-case-form";
import { createTestCase, type NewTestCaseState } from "./actions";

const initialState: NewTestCaseState = {
  errors: {},
  message: null,
  values: { title: "", description: "", preconditions: "", expectedResult: "" },
  priority: DEFAULT_TEST_CASE_PRIORITY,
  status: DEFAULT_TEST_CASE_STATUS,
  steps: [],
};

export function NewTestCaseForm({
  projectId,
  releaseId,
  buildId,
}: {
  projectId: string;
  releaseId: string;
  buildId: string;
}) {
  const [state, formAction, pending] = useActionState(createTestCase, initialState);

  return (
    <TestCaseForm
      state={state}
      formAction={formAction}
      pending={pending}
      hiddenFields={{ projectId, releaseId, buildId }}
      submitIcon={Plus}
      submitLabel="Create Test Case"
      pendingLabel="Creating…"
      cancelHref={`/projects/${projectId}/releases/${releaseId}/builds/${buildId}`}
    />
  );
}
