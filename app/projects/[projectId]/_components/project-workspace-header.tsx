"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Input } from "@/components/ui/input";

import { useReleaseSearch } from "./release-search-context";

const sectionNames: Record<string, string> = {
  members: "Members",
  releases: "Releases",
  settings: "Settings",
};

export function ProjectWorkspaceHeader({ projectId, projectName }: { projectId: string; projectName: string }) {
  const pathname = usePathname();
  const segment = pathname.split("/").filter(Boolean)[2] ?? "";
  const section = sectionNames[segment] ?? "Overview";
  const { query, setQuery } = useReleaseSearch();
  const showReleaseSearch = pathname === `/projects/${projectId}/releases`;

  return (
    <header className="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-md border-b border-border bg-card px-lg py-xs">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-xs text-body-md">
        <Link href={`/projects/${projectId}`} className="truncate text-muted-foreground hover:text-foreground">
          {projectName}
        </Link>
        <span aria-hidden="true" className="text-border">/</span>
        <span aria-current="page" className="font-medium text-foreground">{section}</span>
      </nav>
      {showReleaseSearch && (
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Search releases</span>
          <Search className="pointer-events-none absolute left-sm top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search releases or versions…"
            className="bg-background pl-xl"
          />
        </label>
      )}
    </header>
  );
}
