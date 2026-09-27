"use client";

import { FolderPlus, Plus } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { FormAlert, TextareaField, TextField } from "@/components/form/fields";
import { Button } from "@/components/ui/button";
import { MAXIMUM_DESCRIPTION_LENGTH, MAXIMUM_NAME_LENGTH } from "@/lib/projects/limits";

import { useProjectDetails } from "../_components/use-project-details";
import { createProject, type NewProjectState } from "./actions";

const initialState: NewProjectState = {
  errors: {},
  message: null,
  values: { name: "", description: "" },
};

export function NewProjectForm() {
  const [state, formAction, pending] = useActionState(createProject, initialState);

  // The same rules the action runs, mirrored here so a refusal costs no round trip. The action runs
  // them regardless, because it is reachable without a form.
  const details = useProjectDetails(state.values, state.errors);

  return (
    /*
      `noValidate` for the reason the registration form gives: the browser's own bubble would speak
      in its own words and its own styling while every other problem on this form is reported in
      ours. The server validates regardless, because it has to.

      `onSubmit` is the browser's half of the refusal. It stops a submission already known to be
      wrong — a blank name does not need a round trip to be recognised — and reveals every reason at
      once. With no client bundle the handler never runs, the form posts natively, and the action
      refuses instead: the same messages, one round trip later.
    */
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

      <TextField
        id="name"
        name="name"
        label="Project Name"
        icon={FolderPlus}
        placeholder="e.g. Mobile Banking App"
        autoComplete="off"
        defaultValue={state.values.name}
        {...details.fieldProps("name")}
        error={details.errors.name}
        // The limit before submission, not after. Being told a rule you could not have known is the
        // failure this line exists to prevent. Plain text, because the field frame is what wraps a
        // hint in a paragraph and names it to a screen reader.
        hint={`Up to ${MAXIMUM_NAME_LENGTH} characters.`}
      />

      <TextareaField
        id="description"
        name="description"
        label="Description"
        placeholder="What this project is for, and who is testing it."
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
          {pending ? "Creating…" : "Create Project"}
        </Button>
        <Button asChild variant="ghost">
          <Link href="/projects">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
