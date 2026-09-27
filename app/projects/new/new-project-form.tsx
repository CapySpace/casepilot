"use client";

import { FolderPlus, Plus } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { FormAlert, TextareaField, TextField } from "@/components/form/fields";
import { Button } from "@/components/ui/button";
import { MAXIMUM_DESCRIPTION_LENGTH, MAXIMUM_NAME_LENGTH } from "@/lib/projects/limits";
import { validateProjectDetails } from "@/lib/projects/validation";

import { createProject, type NewProjectState } from "./actions";

const initialState: NewProjectState = {
  errors: {},
  message: null,
  values: { name: "", description: "" },
};

export function NewProjectForm() {
  const [state, formAction, pending] = useActionState(createProject, initialState);

  /*
    The same rules the action runs, run here too — the duplication registration's validation module
    exists for. This half is for immediate feedback: being told a name is too long after a round trip,
    when the limit was on screen the whole time, is a worse form than one that answers as you type.

    Mirrored from the fields rather than controlling them, so the inputs stay uncontrolled and a
    submission still carries what was typed when the client bundle has not loaded.
  */
  const [typed, setTyped] = useState({ name: state.values.name, description: state.values.description });
  const [touched, setTouched] = useState({ name: false, description: false });
  const live = validateProjectDetails(typed);

  // A field the User has not been near yet is not wrong, it is empty. Until they touch it, the only
  // thing worth reporting is what the server already said about a submission they made.
  const nameError = (touched.name ? live.name : undefined) ?? state.errors.name;
  const descriptionError = (touched.description ? live.description : undefined) ?? state.errors.description;

  const invalid = Object.keys(live).length > 0;

  return (
    /*
      `noValidate` for the reason the registration form gives: the browser's own bubble would speak
      in its own words and its own styling while every other problem on this form is reported in
      ours. The server validates regardless, because it has to.

      `onSubmit` is the browser's half of the refusal. It stops a submission that is already known to
      be wrong — a blank name does not need a round trip to be recognised — and marks both fields
      touched so the reasons appear. With no client bundle the handler never runs, the form posts
      natively, and the action refuses instead: the same two messages, one round trip later.
    */
    <form
      action={formAction}
      noValidate
      onSubmit={(event) => {
        if (!invalid) return;
        event.preventDefault();
        setTouched({ name: true, description: true });
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
        onChange={(event) => setTyped((fields) => ({ ...fields, name: event.target.value }))}
        onBlur={() => setTouched((fields) => ({ ...fields, name: true }))}
        error={nameError}
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
        onChange={(event) =>
          setTyped((fields) => ({ ...fields, description: event.target.value }))
        }
        onBlur={() => setTouched((fields) => ({ ...fields, description: true }))}
        error={descriptionError}
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
