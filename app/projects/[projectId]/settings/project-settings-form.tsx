"use client";

import { Check, FolderPlus, Save } from "lucide-react";
import { useActionState } from "react";

import { FormAlert, TextareaField, TextField } from "@/components/form/fields";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { MAXIMUM_DESCRIPTION_LENGTH, MAXIMUM_NAME_LENGTH } from "@/lib/projects/limits";
import type { ProjectDetails } from "@/lib/projects/validation";

import { useProjectDetails } from "../../_components/use-project-details";
import { updateProject, type ProjectSettingsState } from "./actions";

export function ProjectSettingsForm({
  projectId,
  details: saved,
}: {
  /**
   * Posted as a hidden field rather than bound into the action, because a bound action does not
   * survive a submission with no client bundle — see the note in `actions.ts`. The action re-checks
   * ownership of whatever id arrives, so the field is an argument and not a permission.
   */
  projectId: string;
  details: ProjectDetails;
}) {
  const [state, formAction, pending] = useActionState(updateProject, {
    errors: {},
    message: null,
    notice: null,
    values: saved,
  } satisfies ProjectSettingsState);

  const details = useProjectDetails(state.values, state.errors);

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
      <input type="hidden" name="projectId" value={projectId} />

      <FormAlert message={state.message} />

      {state.notice && (
        /*
          Neutral, not green. A save that worked is not a *Passed* verdict, and the status scale means
          one thing in this product — so the confirmation earns an icon and plain type instead.
        */
        <Alert>
          <Check aria-hidden="true" />
          <AlertDescription>{state.notice}</AlertDescription>
        </Alert>
      )}

      <TextField
        id="name"
        name="name"
        label="Project Name"
        icon={FolderPlus}
        autoComplete="off"
        defaultValue={state.values.name}
        {...details.fieldProps("name")}
        error={details.errors.name}
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

      <div>
        <Button type="submit" disabled={pending}>
          <Save aria-hidden="true" />
          {pending ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
