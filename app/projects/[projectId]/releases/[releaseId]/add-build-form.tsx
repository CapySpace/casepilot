"use client";

import { Hash, Plus, X } from "lucide-react";
import { useActionState, useState } from "react";

import { FormAlert, TextareaField, TextField } from "@/components/form/fields";
import { Button } from "@/components/ui/button";
import { MAXIMUM_BUILD_NUMBER_LENGTH, MAXIMUM_DESCRIPTION_LENGTH } from "@/lib/builds/limits";
import { validateBuildDetails } from "@/lib/builds/validation";

import { useMirroredFields } from "../../../_components/use-mirrored-fields";
import { createBuild, type NewBuildState } from "./actions";

const initialState: NewBuildState = {
  errors: {},
  message: null,
  succeeded: false,
  values: { buildNumber: "", description: "" },
};

/**
 * The "Add Build" action on Release Details: closed until pressed, open until it succeeds or is
 * cancelled.
 *
 * The whole of the confirmation that a create worked is the new row appearing in the list above this —
 * there is no separate notice to show, the same way landing on a freshly created Release is
 * `NewReleaseForm`'s. What tells this component to close is `state.succeeded`, compared by the state
 * object's own identity rather than reused across renders: see `ReleaseDetails`'s comment on the same
 * shape of bug, which a value comparison here would repeat for a *second* Build created in one visit.
 */
export function AddBuildForm({ projectId, releaseId }: { projectId: string; releaseId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createBuild, initialState);

  const details = useMirroredFields(state.values, validateBuildDetails, state.errors);

  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state.succeeded) setOpen(false);
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Plus aria-hidden="true" />
        Add Build
      </Button>
    );
  }

  return (
    <form
      action={formAction}
      noValidate
      onSubmit={(event) => {
        if (!details.invalid) return;
        event.preventDefault();
        details.revealEverything();
      }}
      className="flex flex-col gap-md rounded-xl border border-border bg-card p-md"
    >
      {/*
        Not bound into the action: a bound Server Action does not survive a submission with no client
        bundle — see `createBuild`'s own comment on `updateRelease`. The action re-checks Membership of
        whatever Project id arrives, so these are arguments, not permissions.
      */}
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="releaseId" value={releaseId} />

      <FormAlert message={state.message} />

      <TextField
        id="buildNumber"
        name="buildNumber"
        label="Build Number"
        icon={Hash}
        placeholder="e.g. 100"
        autoComplete="off"
        defaultValue={state.values.buildNumber}
        {...details.fieldProps("buildNumber")}
        error={details.errors.buildNumber}
        hint={`Up to ${MAXIMUM_BUILD_NUMBER_LENGTH} characters. Assigned by CI, not CasePilot.`}
      />

      <TextareaField
        id="description"
        name="description"
        label="Description"
        placeholder="What this build contains."
        rows={3}
        defaultValue={state.values.description}
        {...details.fieldProps("description")}
        error={details.errors.description}
        note={<span className="text-body-sm text-muted-foreground">Optional</span>}
        hint={`Up to ${MAXIMUM_DESCRIPTION_LENGTH} characters.`}
      />

      <div className="flex flex-wrap items-center gap-xs">
        <Button type="submit" disabled={pending}>
          <Plus aria-hidden="true" />
          {pending ? "Adding…" : "Add Build"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          <X aria-hidden="true" />
          Cancel
        </Button>
      </div>
    </form>
  );
}
