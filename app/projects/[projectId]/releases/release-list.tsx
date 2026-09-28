"use client";

import { ChevronRight, Package, Search, Tag } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { formatDay } from "@/lib/dates";

type ReleaseListRelease = {
  id: string;
  version: string;
  name: string | null;
  description: string | null;
  buildCount: number;
  createdAt: string;
};

type ReleaseListProps = {
  projectId: string;
  releases: ReleaseListRelease[];
};

/**
 * A working version of the Stitch release toolbar.
 *
 * The search is local to the Releases the server already read for this Project. It does not decide
 * visibility and it does not ask for rows the User cannot otherwise see; row-level security and the
 * Project-scoped query have already answered that.
 */
export function ReleaseList({ projectId, releases }: ReleaseListProps) {
  const [query, setQuery] = useState("");

  const filteredReleases = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return releases;

    return releases.filter((release) => {
      const searchableText = [
        release.version,
        release.name ?? "",
        release.description ?? "",
        `${release.buildCount} ${release.buildCount === 1 ? "build" : "builds"}`,
      ]
        .join(" ")
        .toLocaleLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [query, releases]);

  return (
    <div className="flex flex-col gap-lg">
      <label className="relative max-w-full sm:w-96">
        <span className="sr-only">Search releases</span>
        <Search
          className="pointer-events-none absolute left-sm top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search releases or versions…"
          className="bg-card pl-xl"
        />
      </label>

      {filteredReleases.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-lg text-body-sm text-muted-foreground">
          No releases match this search.
        </div>
      ) : (
        <ul className="flex flex-col gap-sm">
          {filteredReleases.map((release, index) => (
            <li key={release.id}>
              <ReleaseRow latest={index === 0 && !query.trim()} projectId={projectId} release={release} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReleaseRow({
  latest,
  projectId,
  release,
}: {
  latest: boolean;
  projectId: string;
  release: ReleaseListRelease;
}) {
  return (
    // One link, stretched over the whole row by its own `after` layer — the same treatment
    // `app/projects/page.tsx`'s `ProjectRow` uses, and for the same reason.
    <div className="group relative flex flex-col gap-md rounded-xl border border-border bg-card p-md shadow-sm transition-colors hover:border-ring/60 hover:bg-accent/40 has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring/50 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-sm sm:items-center">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
          <Tag className="size-5" aria-hidden="true" />
        </span>

        <div className="flex min-w-0 flex-col gap-2xs">
          <div className="flex flex-wrap items-center gap-xs">
            {/*
              A version is an identifier per DESIGN.md §2 ("every identifier and link: case IDs,
              build versions") — Navigational Sapphire and monospace, not the Plus Jakarta Sans title
              treatment `ProjectRow` gives a Project's name.
            */}
            <h2 className="font-mono text-title-lg font-semibold text-reference">
              <Link
                href={`/projects/${projectId}/releases/${release.id}`}
                className="after:absolute after:inset-0 focus-visible:outline-none"
              >
                {release.version}
              </Link>
            </h2>
            {latest && (
              <span className="rounded-md border border-border bg-secondary px-xs py-2xs text-body-sm font-medium text-secondary-foreground">
                Latest
              </span>
            )}
            {release.name && (
              <span className="line-clamp-1 text-body-sm font-medium text-foreground">
                {release.name}
              </span>
            )}
          </div>

          {release.description && (
            <p className="line-clamp-1 text-body-md text-muted-foreground">{release.description}</p>
          )}

          <span className="text-body-sm text-muted-foreground tabular-nums">
            Created {formatDay(release.createdAt)}
          </span>
        </div>
      </div>

      <span
        aria-hidden="true"
        className="flex w-fit shrink-0 items-center gap-sm rounded-lg border border-border bg-card px-sm py-xs text-body-sm font-medium text-foreground shadow-sm transition-colors group-hover:text-reference"
      >
        <span className="flex items-center gap-2xs tabular-nums">
          <Package className="size-3.5" aria-hidden="true" />
          {release.buildCount} {release.buildCount === 1 ? "build" : "builds"}
        </span>
        <ChevronRight className="size-4" />
      </span>
    </div>
  );
}
