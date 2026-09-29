"use client";

import { cn } from "cn";
import { TriangleAlert, type LucideIcon } from "lucide-react";
import { useId, type ComponentProps, type ReactNode } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * The field parts every form in CasePilot is built from.
 *
 * These began life in `app/(auth)/_components/fields.tsx`, whose own comment said they were extracted
 * "once sign-up needed the same field markup". The Project forms are the next caller, and a second
 * copy of an error-rendering convention is how two forms start disagreeing about what a rejected
 * field looks like. What is genuinely about passwords stayed behind.
 */

/** 44px tall, which is the field height the design draws, with room for a leading icon. */
export const FIELD_CLASSES = "h-11 rounded-lg pl-10 text-body-md";

export const ICON_CLASSES =
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

export function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null;

  return (
    <p id={id} className="text-body-sm text-destructive">
      {message}
    </p>
  );
}

/**
 * The ids a field needs, and what a screen reader should be told to read with it.
 *
 * Both the hint and the error are named in `aria-describedby`, not just the error: a limit stated
 * under a field is part of what the field means, and a hint only sighted people can see is a rule
 * only sighted people are told.
 */
function useFieldDescription({
  id,
  hint,
  error,
}: {
  id: string | undefined;
  hint: ReactNode;
  error: string | undefined;
}) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;

  const describedBy = [hint ? hintId : undefined, error ? errorId : undefined]
    .filter(Boolean)
    .join(" ");

  return {
    fieldId,
    errorId,
    hintId,
    describedBy: describedBy === "" ? undefined : describedBy,
  };
}

type FieldFrameProps = {
  fieldId: string;
  label: string;
  /** Sits opposite the label. The Project description uses it to say the field is optional. */
  note?: ReactNode;
  hint?: ReactNode;
  hintId: string;
  errorId: string;
  error?: string;
  children: ReactNode;
};

/** Label, control, hint, error — in that order, at that spacing, for every field in the product. */
function FieldFrame({
  fieldId,
  label,
  note,
  hint,
  hintId,
  errorId,
  error,
  children,
}: FieldFrameProps) {
  return (
    <div className="flex flex-col gap-2xs">
      <div className="flex items-baseline justify-between">
        <Label htmlFor={fieldId} className="text-label-md">
          {label}
        </Label>
        {note}
      </div>
      {children}
      {hint && (
        <p id={hintId} className="text-body-sm text-muted-foreground">
          {hint}
        </p>
      )}
      <FieldError id={errorId} message={error} />
    </div>
  );
}

type TextFieldProps = ComponentProps<typeof Input> & {
  label: string;
  icon: LucideIcon;
  error?: string;
  /** Rendered under the field: a limit, a rule, whatever the screen owes the User up front. */
  hint?: ReactNode;
  note?: ReactNode;
};

export function TextField({ label, icon: Icon, error, hint, note, id, ...props }: TextFieldProps) {
  const { fieldId, errorId, hintId, describedBy } = useFieldDescription({ id, hint, error });

  return (
    <FieldFrame
      fieldId={fieldId}
      label={label}
      note={note}
      hint={hint}
      hintId={hintId}
      errorId={errorId}
      error={error}
    >
      <div className="relative">
        <span className={ICON_CLASSES}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <Input
          id={fieldId}
          aria-invalid={error !== undefined}
          aria-describedby={describedBy}
          className={FIELD_CLASSES}
          {...props}
        />
      </div>
    </FieldFrame>
  );
}

type SelectFieldProps = ComponentProps<"select"> & {
  label: string;
  error?: string;
  hint?: ReactNode;
  note?: ReactNode;
};

/** An enum field — a fixed, small set of values with no need for a leading icon or free text. */
export function SelectField({
  label,
  error,
  hint,
  note,
  id,
  className,
  children,
  ...props
}: SelectFieldProps) {
  const { fieldId, errorId, hintId, describedBy } = useFieldDescription({ id, hint, error });

  return (
    <FieldFrame
      fieldId={fieldId}
      label={label}
      note={note}
      hint={hint}
      hintId={hintId}
      errorId={errorId}
      error={error}
    >
      <select
        id={fieldId}
        aria-invalid={error !== undefined}
        aria-describedby={describedBy}
        className={cn(
          "h-11 w-full rounded-lg border border-input bg-transparent px-3 text-body-md outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </FieldFrame>
  );
}

type TextareaFieldProps = ComponentProps<typeof Textarea> & {
  label: string;
  error?: string;
  hint?: ReactNode;
  note?: ReactNode;
};

export function TextareaField({ label, error, hint, note, id, ...props }: TextareaFieldProps) {
  const { fieldId, errorId, hintId, describedBy } = useFieldDescription({ id, hint, error });

  return (
    <FieldFrame
      fieldId={fieldId}
      label={label}
      note={note}
      hint={hint}
      hintId={hintId}
      errorId={errorId}
      error={error}
    >
      {/* No leading icon: an icon beside a multi-line field sits against the first line only. */}
      <Textarea
        id={fieldId}
        aria-invalid={error !== undefined}
        aria-describedby={describedBy}
        className="min-h-24 rounded-lg px-3 py-2 text-body-md"
        {...props}
      />
    </FieldFrame>
  );
}
