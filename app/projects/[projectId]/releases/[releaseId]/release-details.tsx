"use client";

import { Check, Milestone, Pencil, Save, Tag, X } from "lucide-react";
import { useActionState, useState } from "react";

import { FormAlert, TextareaField, TextField } from "@/components/form/fields";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MAXIMUM_DESCRIPTION_LENGTH,
  MAXIMUM_NAME_LENGTH,
  MAXIMUM_VERSION_LENGTH,
} from "@/lib/releases/limits";
import { validateReleaseDetails, type ReleaseDetails } from "@/lib/releases/validation";

import { useMirroredFields } from "../../../_components/use-mirrored-fields";
import { updateRelease, type ReleaseDetailsState } from "./actions";

/**
 * A Release's version, name and description — and, for any Member, the form that changes them.
 *
 * There is no Owner/Member split here, unlike Project Settings: editing happens inline on this page
 * rather than behind a separate route that would exist for no reason — see the spec. That is why this
 * toggles a form open in place rather than following `ProjectSettingsForm`'s always-visible one.
 */
export function ReleaseDetails({
  projectId,
  releaseId,
  saved,
}: {
  projectId: string;
  releaseId: string;
  saved: ReleaseDetails;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateRelease, {
    errors: {},
    message: null,
    notice: null,
    values: saved,
  } satisfies ReleaseDetailsState);

  // The same rules the action runs, mirrored here so a refusal costs no round trip.
  const details = useMirroredFields(state.values, validateReleaseDetails, state.errors);

  // A save that worked returns to the read view: the values it now shows are the ones that were just
  // saved, so there is nothing left for the form to be open for. Adjusted here, during render, rather
  // than in an effect — the same "some state changed, so reset other state" case React's own docs
  // single out as not needing one, since a `state` this render did not have last render is knowable
  // without waiting for a commit.
  //
  // Compared by identity, not by `state.notice`'s value: `updateRelease` returns a fresh object on
  // every call, but `releaseMessages.releaseUpdated` is the same string each time, so a *second*
  // consecutive successful save would leave `state.notice` reading as "unchanged" to a value
  // comparison and the form would stay open despite the write having succeeded.
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state.notice) setEditing(false);
  }

  if (!editing) {
    return (
      <div className="flex flex-col gap-md border-b border-border pb-lg">
        <div className="flex flex-wrap items-start justify-between gap-md">
          <div className="flex flex-col gap-2xs">
            <h1 className="font-mono text-headline-md font-semibold text-reference">
              {state.values.version}
            </h1>
            {state.values.name && (
              <p className="text-title-lg text-muted-foreground">{state.values.name}</p>
            )}
          </div>
          <Button variant="secondary" onClick={() => setEditing(true)}>
            <Pencil aria-hidden="true" />
            Edit
          </Button>
        </div>

        {state.notice && (
          // Neutral, not green, for the reason `ProjectSettingsForm` gives: a save that worked is not a
          // *Passed* verdict, and the status scale means one thing in this product.
          <Alert>
            <Check aria-hidden="true" />
            <AlertDescription>{state.notice}</AlertDescription>
          </Alert>
        )}

        <p className="text-body-md text-muted-foreground">
          {state.values.description || "No description yet."}
        </p>
      </div>
    );
  }

  return (
    <Card className="max-w-reading">
      <CardHeader>
        <CardTitle>Edit release</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          action={formAction}
          noValidate
          onSubmit={(event) => {
            if (!details.invalid) return;
            event.preventDefault();
            details.revealEverything();
          }}
          className="flex flex-col gap-md"
        >
          {/*
            Not bound into the action: a bound Server Action does not survive a submission with no
            client bundle — see `updateRelease`'s own comment. The action re-checks Membership of
            whatever Project id arrives, so these are arguments, not permissions.
          */}
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="releaseId" value={releaseId} />

          <FormAlert message={state.message} />

          <TextField
            id="version"
            name="version"
            label="Version"
            icon={Tag}
            autoComplete="off"
            defaultValue={state.values.version}
            {...details.fieldProps("version")}
            error={details.errors.version}
            hint={`Up to ${MAXIMUM_VERSION_LENGTH} characters.`}
          />

          <TextField
            id="name"
            name="name"
            label="Name"
            icon={Milestone}
            autoComplete="off"
            defaultValue={state.values.name}
            {...details.fieldProps("name")}
            error={details.errors.name}
            note={<span className="text-body-sm text-muted-foreground">Optional</span>}
            hint={`Up to ${MAXIMUM_NAME_LENGTH} characters.`}
          />

          <TextareaField
            id="description"
            name="description"
            label="Description"
            rows={4}
            defaultValue={state.values.description}
            {...details.fieldProps("description")}
            error={details.errors.description}
            note={<span className="text-body-sm text-muted-foreground">Optional</span>}
            hint={`Up to ${MAXIMUM_DESCRIPTION_LENGTH} characters.`}
          />

          <div className="flex flex-wrap items-center gap-xs">
            <Button type="submit" disabled={pending}>
              <Save aria-hidden="true" />
              {pending ? "Saving…" : "Save Changes"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
              <X aria-hidden="true" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
