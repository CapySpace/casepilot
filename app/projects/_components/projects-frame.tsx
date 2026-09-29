"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function ProjectsFrame({
  children,
  projectsFrame,
}: {
  children: ReactNode;
  projectsFrame: ReactNode;
}) {
  const pathname = usePathname();
  const isProjectWorkspace =
    pathname.startsWith("/projects/") && !pathname.startsWith("/projects/new");

  return isProjectWorkspace ? children : projectsFrame;
}
