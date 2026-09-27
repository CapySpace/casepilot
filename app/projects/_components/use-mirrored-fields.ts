"use client";

import { useState } from "react";

/**
 * Fields as they are being typed, and what is currently wrong with them.
 *
 * Every form in the Project area needs exactly this: the browser answering immediately, and the Server
 * Action answering again because it is reachable without a form. The rules themselves live in
 * `lib/projects/validation.ts` and are passed in — this holds only the mirroring, which was the same in
 * all three forms and is the whole of what they shared.
 *
 * The fields stay *uncontrolled*: this mirrors what is typed rather than owning it, which is what lets a
 * submission carry the values when the client bundle has not loaded. `defaultValue` therefore stays the
 * form's business, and resetting after a success is done by remounting rather than by writing state — see
 * the invite form.
 */
export function useMirroredFields<Fields extends Record<string, string>>(
  initial: Fields,
  validate: (fields: Fields) => Partial<Record<keyof Fields, string>>,
  serverErrors: Partial<Record<keyof Fields, string>>,
) {
  const [typed, setTyped] = useState(initial);
  const [touched, setTouched] = useState<Partial<Record<keyof Fields, boolean>>>({});

  const live = validate(typed);

  const errors = {} as Partial<Record<keyof Fields, string>>;
  for (const field of Object.keys(initial) as (keyof Fields)[]) {
    // A field nobody has been near yet is not wrong, it is empty. Until it is touched the only thing
    // worth reporting is what the server said about a submission that was actually made.
    errors[field] = (touched[field] ? live[field] : undefined) ?? serverErrors[field];
  }

  return {
    /** True when the browser already knows the submission would be refused. */
    invalid: Object.keys(live).length > 0,

    errors,

    /** Spread onto a field: mirror what is typed, and mark it touched once it is left. */
    fieldProps(field: keyof Fields) {
      return {
        onChange: (event: { target: { value: string } }) =>
          setTyped((fields) => ({ ...fields, [field]: event.target.value })),
        onBlur: () => setTouched((fields) => ({ ...fields, [field]: true })),
      };
    },

    /** Called when a submission is stopped, so every reason appears at once rather than one by one. */
    revealEverything() {
      const all = {} as Partial<Record<keyof Fields, boolean>>;
      for (const field of Object.keys(initial) as (keyof Fields)[]) all[field] = true;
      setTouched(all);
    },
  };
}
