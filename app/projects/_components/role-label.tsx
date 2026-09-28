import type { ProjectRole } from "@/lib/projects/dal";

/**
 * What a Role looks like, in the one place that decides.
 *
 * Two lists show a Role now — the Projects list and the Members list — and they must agree, because a
 * Role that is a grey label on one screen and something louder on another reads as two different
 * facts.
 *
 * It carries no status colour and it is not a pill. `DESIGN.md` reserves the status scale for execution
 * states and full curvature for the chips that show them, so a green rounded "Owner" would claim a
 * verdict about the Project and borrow the silhouette that means one. A quiet 8px container says
 * "label", which is what this is.
 */
export function RoleLabel({ role }: { role: ProjectRole }) {
  const owner = role === "owner";

  return (
    <span
      className={`inline-block rounded-md px-2 py-0.5 text-body-sm ${
        owner
          ? // Filled and heavier, so which of several rows is the Owner's is answerable at a glance rather
            // than by reading. Weight and fill rather than colour: the word is still what carries the
            // meaning, and the status scale means execution state alone. The Stitch reference tints this
            // chip emerald, which is the one thing DESIGN.md will not have — a verdict-coloured Role.
            "bg-secondary font-semibold text-secondary-foreground"
          : "border border-border font-medium text-muted-foreground"
      }`}
    >
      {owner ? "Owner" : "Member"}
    </span>
  );
}
