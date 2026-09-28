"use client";

import { Milestone, Plus, Tag } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { FormAlert, TextareaField, TextField } from "@/components/form/fields";
import { Button } from "@/components/ui/button";
import {
  MAXIMUM_DESCRIPTION_LENGTH,
  MAXIMUM_NAME_LENGTH,
  MAXIMUM_VERSION_LENGTH,
} from "@/lib/releases/limits";
import { validateReleaseDetails } from "@/lib/releases/validation";

import { useMirroredFields } from "../../../_components/use-mirrored-fields";
import { createRelease, type NewReleaseState } from "./actions";

const initialState: NewReleaseState = {
  errors: {},
  message: null,
  values: { version: "", name: "", description: "" },
};

export function NewReleaseForm({ projectId }: { projectId: string }) {
  const [state, formAction, pending] = useActionState(createRelease, initialState);

  // The same rules the action runs, mirrored here so a refusal costs no round trip. The action runs
  // them regardless, because it is reachable without a form.
  const details = useMirroredFields(state.values, validateReleaseDetails, state.errors);

  return (
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
      <FormAlert message={state.message} />

      {/*
        Not bound into the action: a bound Server Action does not survive a submission with no client
        bundle. The action re-checks Membership of whatever id arrives, so this is an argument, not a
        permission.
      */}
      <input type="hidden" name="projectId" value={projectId} />

      <TextField
        id="version"
        name="version"
        label="Version"
        icon={Tag}
        placeholder="e.g. 1.0.0"
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
        placeholder="e.g. Payments Overhaul"
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
        placeholder="What changed in this release."
        rows={4}
        defaultValue={state.values.description}
        {...details.fieldProps("description")}
        error={details.errors.description}
        note={<span className="text-body-sm text-muted-foreground">Optional</span>}
        hint={`Up to ${MAXIMUM_DESCRIPTION_LENGTH} characters.`}
      />

      <div className="flex flex-wrap items-center gap-xs">
        <Button type="submit" disabled={pending}>
          <Plus aria-hidden="true" />
          {pending ? "Creating…" : "Create Release"}
        </Button>
        <Button asChild variant="ghost">
          <Link href={`/projects/${projectId}/releases`}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
