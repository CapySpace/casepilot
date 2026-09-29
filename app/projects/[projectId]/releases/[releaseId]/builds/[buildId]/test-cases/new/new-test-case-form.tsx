"use client";

import { ChevronDown, ChevronUp, ClipboardList, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { useMirroredFields } from "@/app/projects/_components/use-mirrored-fields";
import { FormAlert, SelectField, TextareaField, TextField } from "@/components/form/fields";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  MAXIMUM_DESCRIPTION_LENGTH,
  MAXIMUM_EXPECTED_RESULT_LENGTH,
  MAXIMUM_PRECONDITIONS_LENGTH,
  MAXIMUM_STEP_ACTION_LENGTH,
  MAXIMUM_STEP_EXPECTED_RESULT_LENGTH,
  MAXIMUM_STEPS,
  MAXIMUM_TITLE_LENGTH,
} from "@/lib/test-cases/limits";
import {
  DEFAULT_TEST_CASE_PRIORITY,
  DEFAULT_TEST_CASE_STATUS,
  TEST_CASE_PRIORITIES,
  TEST_CASE_STATUSES,
  validateSteps,
  validateTestCaseDetails,
  type StepDetails,
} from "@/lib/test-cases/validation";

import { createTestCase, type NewTestCaseState } from "./actions";

const initialState: NewTestCaseState = {
  errors: {},
  message: null,
  values: { title: "", description: "", preconditions: "", expectedResult: "" },
  priority: DEFAULT_TEST_CASE_PRIORITY,
  status: DEFAULT_TEST_CASE_STATUS,
  steps: [],
};

/** A step, plus a client-only identity for React's list reconciliation — never sent to the server. */
type StepWithKey = StepDetails & { key: string };

function withKeys(steps: StepDetails[]): StepWithKey[] {
  return steps.map((step) => ({ ...step, key: crypto.randomUUID() }));
}

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

  // The same rules the action runs, mirrored here so a refusal costs no round trip.
  const details = useMirroredFields(state.values, validateTestCaseDetails, state.errors);

  // Hydrates once from whatever the server last saw — the no-JS fallback's only render — and is then
  // this component's own state: `validateSteps` is pure, so errors are recomputed from it directly
  // rather than threaded back through `state`. See `NewTestCaseState`'s own comment on `steps`.
  const [steps, setSteps] = useState<StepWithKey[]>(() => withKeys(state.steps));
  const [stepsRevealed, setStepsRevealed] = useState(() => {
    const initial = validateSteps(state.steps);
    return initial.stepsError !== null || initial.stepErrors.some((error) => Object.keys(error).length > 0);
  });

  const liveSteps = validateSteps(steps);
  const stepsInvalid =
    liveSteps.stepsError !== null || liveSteps.stepErrors.some((error) => Object.keys(error).length > 0);

  function addStep() {
    setSteps((current) => [...current, { action: "", expectedResult: "", key: crypto.randomUUID() }]);
  }

  function removeStep(index: number) {
    setSteps((current) => current.filter((_, i) => i !== index));
  }

  function moveStep(index: number, direction: -1 | 1) {
    setSteps((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function updateStep(index: number, field: keyof StepDetails, value: string) {
    setSteps((current) => current.map((step, i) => (i === index ? { ...step, [field]: value } : step)));
  }

  return (
    <form
      action={formAction}
      noValidate
      onSubmit={(event) => {
        if (!details.invalid && !stepsInvalid) return;
        event.preventDefault();
        details.revealEverything();
        setStepsRevealed(true);
      }}
      className="flex flex-col gap-lg"
    >
      {/*
        Not bound into the action: a bound Server Action does not survive a submission with no client
        bundle — see `createRelease`'s own comment on `updateRelease`. The action re-checks Membership
        of whatever Project id arrives, so these are arguments, not permissions.
      */}
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="releaseId" value={releaseId} />
      <input type="hidden" name="buildId" value={buildId} />
      {/* Steps travel as one JSON field: their count and order change as a Member edits, and FormData
          has no way to say "this group of fields belongs together as item 3." */}
      <input
        type="hidden"
        name="steps"
        value={JSON.stringify(steps.map(({ action, expectedResult }) => ({ action, expectedResult })))}
      />

      <FormAlert message={state.message} />

      <TextField
        id="title"
        name="title"
        label="Title"
        icon={ClipboardList}
        placeholder="e.g. Sign in with valid credentials"
        autoComplete="off"
        defaultValue={state.values.title}
        {...details.fieldProps("title")}
        error={details.errors.title}
        hint={`Up to ${MAXIMUM_TITLE_LENGTH} characters.`}
      />

      <TextareaField
        id="description"
        name="description"
        label="Description"
        placeholder="Additional context or purpose."
        rows={3}
        defaultValue={state.values.description}
        {...details.fieldProps("description")}
        error={details.errors.description}
        note={<span className="text-body-sm text-muted-foreground">Optional</span>}
        hint={`Up to ${MAXIMUM_DESCRIPTION_LENGTH} characters.`}
      />

      <TextareaField
        id="preconditions"
        name="preconditions"
        label="Preconditions"
        placeholder="What must already be true before testing this."
        rows={3}
        defaultValue={state.values.preconditions}
        {...details.fieldProps("preconditions")}
        error={details.errors.preconditions}
        note={<span className="text-body-sm text-muted-foreground">Optional</span>}
        hint={`Up to ${MAXIMUM_PRECONDITIONS_LENGTH} characters.`}
      />

      <div className="flex flex-col gap-sm">
        <div className="flex items-baseline justify-between">
          <Label className="text-label-md">Steps</Label>
          <span className="text-body-sm text-muted-foreground">Optional</span>
        </div>

        {steps.length === 0 && <p className="text-body-sm text-muted-foreground">No steps yet.</p>}

        {steps.map((step, index) => (
          <div key={step.key} className="flex flex-col gap-xs rounded-lg border border-border p-sm">
            <div className="flex items-center justify-between">
              <span className="text-label-sm uppercase text-muted-foreground">Step {index + 1}</span>
              <div className="flex items-center gap-2xs">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={index === 0}
                  onClick={() => moveStep(index, -1)}
                  aria-label={`Move step ${index + 1} up`}
                >
                  <ChevronUp aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={index === steps.length - 1}
                  onClick={() => moveStep(index, 1)}
                  aria-label={`Move step ${index + 1} down`}
                >
                  <ChevronDown aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeStep(index)}
                  aria-label={`Remove step ${index + 1}`}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </div>

            <TextareaField
              label="Action"
              rows={2}
              value={step.action}
              onChange={(event) => updateStep(index, "action", event.target.value)}
              error={stepsRevealed ? liveSteps.stepErrors[index]?.action : undefined}
              hint={`Up to ${MAXIMUM_STEP_ACTION_LENGTH} characters.`}
            />

            <TextareaField
              label="Expected Result"
              rows={2}
              value={step.expectedResult}
              onChange={(event) => updateStep(index, "expectedResult", event.target.value)}
              error={stepsRevealed ? liveSteps.stepErrors[index]?.expectedResult : undefined}
              note={<span className="text-body-sm text-muted-foreground">Optional</span>}
              hint={`Up to ${MAXIMUM_STEP_EXPECTED_RESULT_LENGTH} characters.`}
            />
          </div>
        ))}

        {stepsRevealed && liveSteps.stepsError && (
          <p className="text-body-sm text-destructive">{liveSteps.stepsError}</p>
        )}

        <div>
          <Button
            type="button"
            variant="secondary"
            onClick={addStep}
            disabled={steps.length >= MAXIMUM_STEPS}
          >
            <Plus aria-hidden="true" />
            Add Step
          </Button>
        </div>
      </div>

      <TextareaField
        id="expectedResult"
        name="expectedResult"
        label="Expected Result"
        placeholder="The overall expected outcome."
        rows={3}
        defaultValue={state.values.expectedResult}
        {...details.fieldProps("expectedResult")}
        error={details.errors.expectedResult}
        note={<span className="text-body-sm text-muted-foreground">Optional</span>}
        hint={`Up to ${MAXIMUM_EXPECTED_RESULT_LENGTH} characters.`}
      />

      <div className="flex flex-col gap-md sm:flex-row">
        <SelectField
          id="priority"
          name="priority"
          label="Priority"
          defaultValue={state.priority}
          className="sm:max-w-40"
        >
          {TEST_CASE_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </SelectField>

        <SelectField
          id="status"
          name="status"
          label="Status"
          defaultValue={state.status}
          className="sm:max-w-40"
        >
          {TEST_CASE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="flex flex-wrap items-center gap-xs">
        <Button type="submit" disabled={pending}>
          <Plus aria-hidden="true" />
          {pending ? "Creating…" : "Create Test Case"}
        </Button>
        <Button asChild variant="ghost">
          <Link href={`/projects/${projectId}/releases/${releaseId}/builds/${buildId}`}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
