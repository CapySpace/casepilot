"use client";

import { useState } from "react";

import {
  validateProjectDetails,
  type ProjectDetails,
  type ProjectErrors,
} from "@/lib/projects/validation";

/**
 * A Project's name and description as they are being typed, and what is currently wrong with them.
 *
 * Both Project forms need exactly this and nothing more: create and settings differ in what they
 * submit and what chrome surrounds them, but the mirroring is identical, and the second verbatim copy
 * was the point at which it wanted a name.
 *
 * The fields stay *uncontrolled* — this only mirrors what is typed. That is what lets a submission
 * carry the values when the client bundle has not loaded, and it is why `defaultValue` remains the
 * form's business rather than this hook's.
 */
export function useProjectDetails(initial: ProjectDetails, serverErrors: ProjectErrors) {
  const [typed, setTyped] = useState(initial);
  const [touched, setTouched] = useState({ name: false, description: false });

  const live = validateProjectDetails(typed);

  return {
    /** True when the browser already knows the submission would be refused. */
    invalid: Object.keys(live).length > 0,

    /**
     * A field nobody has been near yet is not wrong, it is empty. Until it is touched the only thing
     * worth reporting is what the server said about a submission that was actually made.
     */
    errors: {
      name: (touched.name ? live.name : undefined) ?? serverErrors.name,
      description: (touched.description ? live.description : undefined) ?? serverErrors.description,
    } satisfies ProjectErrors,

    /** Spread onto a field: mirror what is typed, and mark it touched once it is left. */
    fieldProps(field: keyof ProjectDetails) {
      return {
        onChange: (event: { target: { value: string } }) =>
          setTyped((fields) => ({ ...fields, [field]: event.target.value })),
        onBlur: () => setTouched((fields) => ({ ...fields, [field]: true })),
      };
    },

    /** Called when a submission is stopped, so every reason appears at once rather than one by one. */
    revealEverything() {
      setTouched({ name: true, description: true });
    },
  };
}
