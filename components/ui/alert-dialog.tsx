"use client";

import { AlertDialog as Primitive } from "radix-ui";
import type { ComponentProps } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

/**
 * The confirmation a destructive action asks for.
 *
 * Hand-written rather than pulled from the registry: `shadcn add alert-dialog` insists on overwriting
 * `button.tsx`, which carries this repo's theme and its own `field` size. The structure below is the
 * registry's; the styling is DESIGN.md's — §5 gives a modal `rounded-3xl` (1.5rem) and Level 3 elevation,
 * and §4 keeps the primary button for the committing action, which in a confirmation is the confirming one.
 *
 * Built on the Radix primitive this repo already depends on, so focus is trapped, Escape closes, the
 * heading and description are announced, and the alert dialog role is right without any of it being
 * hand-rolled.
 */

export const AlertDialog = Primitive.Root;
export const AlertDialogTrigger = Primitive.Trigger;

export function AlertDialogContent({ className, ...props }: ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Overlay className="fixed inset-0 z-50 bg-foreground/40 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <Primitive.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-auth-card -translate-x-1/2 -translate-y-1/2 flex-col gap-md rounded-3xl border border-border bg-card p-lg shadow-level-3 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          className,
        )}
        {...props}
      />
    </Primitive.Portal>
  );
}

export function AlertDialogTitle({ className, ...props }: ComponentProps<typeof Primitive.Title>) {
  return (
    <Primitive.Title
      className={cn("font-heading text-headline-sm", className)}
      {...props}
    />
  );
}

export function AlertDialogDescription({
  className,
  ...props
}: ComponentProps<typeof Primitive.Description>) {
  return (
    <Primitive.Description
      className={cn("text-body-md text-muted-foreground", className)}
      {...props}
    />
  );
}

/** The two buttons, side by side on anything but the narrowest screen. */
export function AlertDialogFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col-reverse gap-xs sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

export function AlertDialogAction({ className, ...props }: ComponentProps<typeof Primitive.Action>) {
  return <Primitive.Action className={cn(buttonVariants(), className)} {...props} />;
}

export function AlertDialogCancel({ className, ...props }: ComponentProps<typeof Primitive.Cancel>) {
  return (
    <Primitive.Cancel
      className={cn(buttonVariants({ variant: "secondary" }), className)}
      {...props}
    />
  );
}
