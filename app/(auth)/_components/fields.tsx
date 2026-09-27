"use client";

import { Check, Eye, EyeOff, Lock, TriangleAlert, type LucideIcon } from "lucide-react";
import { useId, useState, type ComponentProps, type ReactNode } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PASSWORD_RULE, PASSWORD_RULE_MET } from "@/lib/auth/messages";
import { isPasswordValid } from "@/lib/auth/validation";

/**
 * The parts every authentication form is built from.
 *
 * Extracted once sign-up needed the same field markup, the same password toggle and the same error
 * rendering as sign-in. Ticket 06's reset-password form is the third.
 */

const FIELD_CLASSES = "h-11 rounded-lg pl-10 text-body-md";
const ICON_CLASSES =
  "pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground";

/** A failure that belongs to the form rather than to any one field. */
export function FormAlert({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <Alert variant="destructive">
      <TriangleAlert />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null;

  return (
    <p id={id} className="text-body-sm text-destructive">
      {message}
    </p>
  );
}

type TextFieldProps = ComponentProps<typeof Input> & {
  label: string;
  icon: LucideIcon;
  error?: string;
};

export function TextField({ label, icon: Icon, error, id, ...props }: TextFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const errorId = `${fieldId}-error`;

  return (
    <div className="flex flex-col gap-2xs">
      <Label htmlFor={fieldId} className="text-label-md">
        {label}
      </Label>
      <div className="relative">
        <span className={ICON_CLASSES}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <Input
          id={fieldId}
          aria-invalid={error !== undefined}
          aria-describedby={error ? errorId : undefined}
          className={FIELD_CLASSES}
          {...props}
        />
      </div>
      <FieldError id={errorId} message={error} />
    </div>
  );
}

type PasswordFieldProps = ComponentProps<typeof Input> & {
  label?: string;
  error?: string;
  /** Rendered under the field: the rule, a live answer to it, whatever the screen needs. */
  hint?: ReactNode;
  /** Sits opposite the label, as the sign-in screen's recovery link does. */
  action?: ReactNode;
};

export function PasswordField({
  label = "Password",
  error,
  hint,
  action,
  id,
  ...props
}: PasswordFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const errorId = `${fieldId}-error`;
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="flex flex-col gap-2xs">
      <div className="flex items-center justify-between">
        <Label htmlFor={fieldId} className="text-label-md">
          {label}
        </Label>
        {action}
      </div>
      <div className="relative">
        <span className={ICON_CLASSES}>
          <Lock className="size-5" aria-hidden="true" />
        </span>
        <Input
          id={fieldId}
          type={revealed ? "text" : "password"}
          aria-invalid={error !== undefined}
          className={`${FIELD_CLASSES} pr-10`}
          {...props}
        />
        {/*
          The reason CasePilot has no confirm-password field anywhere: being able to read what you
          typed does the same job as typing it twice, and does it better.
        */}
        <button
          type="button"
          onClick={() => setRevealed((shown) => !shown)}
          aria-label={revealed ? "Hide password" : "Show password"}
          aria-pressed={revealed}
          className="absolute inset-y-0 right-0 flex items-center rounded-r-lg pr-3 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {revealed ? (
            <EyeOff className="size-5" aria-hidden="true" />
          ) : (
            <Eye className="size-5" aria-hidden="true" />
          )}
        </button>
      </div>
      {hint}
      <FieldError id={errorId} message={error} />
    </div>
  );
}

/**
 * The password rule, stated before anything is submitted and answering as the User types.
 *
 * Shared by registration and by choosing a replacement, so "the same rule and the same live
 * feedback" is a fact about the code rather than two things that happen to agree today. The string
 * comes from the catalogue, which is also what the server and Supabase's own policy enforce.
 */
export function PasswordRuleHint({ password, id }: { password: string; id: string }) {
  const met = isPasswordValid(password);

  return (
    <p
      id={id}
      aria-live="polite"
      className={`flex items-center gap-1.5 text-body-sm ${
        met ? "text-foreground" : "text-muted-foreground"
      }`}
    >
      {met ? (
        <>
          <Check className="size-3.5" aria-hidden="true" />
          {PASSWORD_RULE_MET}
        </>
      ) : (
        PASSWORD_RULE
      )}
    </p>
  );
}
