import type { ReactNode } from "react";

/**
 * The uppercase Label sm signpost DESIGN.md §3 describes: "quiet structural signposts rather than
 * shouting".
 *
 * A heading, not a styled paragraph, because that is what it is: each one names the section under it,
 * so a screen reader can be pointed at it by `aria-labelledby` and somebody navigating by heading
 * finds the sidebar's parts. It was four copies of the same three utilities before it was a component.
 */
export function Eyebrow({
  id,
  className = "",
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <h2 id={id} className={`text-label-sm uppercase text-muted-foreground ${className}`}>
      {children}
    </h2>
  );
}
