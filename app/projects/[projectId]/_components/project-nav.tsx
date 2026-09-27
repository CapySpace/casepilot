"use client";

import { LayoutDashboard, Settings, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Eyebrow } from "@/components/eyebrow";

/**
 * The sidebar's navigation, and the only client component in the shell.
 *
 * It is a Client Component for one reason: a layout cannot know the current path on the server, and
 * "where am I" is the question a sidebar exists to answer. `usePathname` is available during server
 * rendering too, so the active item is already marked in the HTML rather than appearing once the
 * bundle loads.
 *
 * Members arrives in ticket 04 and Releases, Builds and Cases in the next phase. Nothing is listed
 * here before it exists: a navigation item that goes nowhere is worse than a short list.
 */

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export function ProjectNav({ projectId }: { projectId: string }) {
  const pathname = usePathname();

  const items: NavItem[] = [
    { href: `/projects/${projectId}`, label: "Overview", icon: LayoutDashboard },
    { href: `/projects/${projectId}/settings`, label: "Settings", icon: Settings },
  ];

  return (
    // Named by its own eyebrow rather than by an `aria-label` that repeats it differently: two names
    // for one landmark is one name too many.
    <nav aria-labelledby="project-nav-heading">
      <Eyebrow id="project-nav-heading" className="px-sm pb-xs">
        Navigation
      </Eyebrow>
      <ul className="flex flex-col gap-2xs">
        {items.map((item) => {
          const active = pathname === item.href;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                // `aria-current` and not merely a colour: the active item has to be legible to
                // somebody who cannot see the tint.
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center gap-xs rounded-lg px-sm py-2 text-body-md transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
                  active
                    ? // Pale Mint Wash behind Deep Pine Green, with the leading edge and trailing dot
                      // DESIGN.md §4 draws. Brand, not status: an active page is not a verdict.
                      //
                      // The leading edge is drawn as an inset layer rather than a left border, so the
                      // label does not need its padding compensating by two pixels — which is how a
                      // raw pixel ends up in a bracket value the design rules forbid.
                      "bg-brand-wash font-medium text-primary before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-full before:bg-primary"
                    : "text-foreground hover:bg-accent"
                }`}
              >
                <item.icon className="size-4" aria-hidden="true" />
                {item.label}
                {active && (
                  <span className="ml-auto size-2 rounded-full bg-brand" aria-hidden="true" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
