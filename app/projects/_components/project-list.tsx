"use client";

import { ArrowRight, FolderKanban, Search, Users } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDay } from "@/lib/dates";

import { RoleLabel } from "./role-label";

type ProjectRole = "owner" | "member";

type ProjectListProject = {
  id: string;
  name: string;
  description: string | null;
  role: ProjectRole;
  memberCount: number;
  createdAt: string;
};

type ProjectScope = "all" | ProjectRole;

type ProjectListProps = {
  projects: ProjectListProject[];
};

/**
 * The toolbar in the Stitch reference is allowed to be here only because it works.
 *
 * Searching and the three role scopes are local to the already-visible list; they do not change the
 * database question. Row-level security still decides which Projects exist for this User, and this
 * component only helps scan that answer.
 */
export function ProjectList({ projects }: ProjectListProps) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<ProjectScope>("all");

  const counts = useMemo(
    () => ({
      all: projects.length,
      owner: projects.filter((project) => project.role === "owner").length,
      member: projects.filter((project) => project.role === "member").length,
    }),
    [projects],
  );

  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return projects.filter((project) => {
      const inScope = scope === "all" || project.role === scope;
      if (!inScope) return false;

      if (!normalizedQuery) return true;

      const searchableText = `${project.name} ${project.description ?? ""}`.toLocaleLowerCase();
      return searchableText.includes(normalizedQuery);
    });
  }, [projects, query, scope]);

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-col gap-sm lg:flex-row lg:items-center lg:justify-between">
        <label className="relative max-w-full lg:w-72">
          <span className="sr-only">Filter projects</span>
          <Search
            className="pointer-events-none absolute left-sm top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter projects or keys…"
            className="bg-card pl-xl"
          />
        </label>

        <div className="flex flex-col gap-sm sm:flex-row sm:items-center sm:justify-between lg:flex-1">
          <div
            className="inline-flex w-fit rounded-lg border border-border bg-secondary p-2xs"
            aria-label="Project ownership filter"
          >
            <ScopeButton active={scope === "all"} onClick={() => setScope("all")}>
              All <span className="tabular-nums">({counts.all})</span>
            </ScopeButton>
            <ScopeButton active={scope === "owner"} onClick={() => setScope("owner")}>
              Owned by me <span className="tabular-nums">({counts.owner})</span>
            </ScopeButton>
            <ScopeButton active={scope === "member"} onClick={() => setScope("member")}>
              Shared <span className="tabular-nums">({counts.member})</span>
            </ScopeButton>
          </div>
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-lg text-body-sm text-muted-foreground">
          No projects match this view.
        </div>
      ) : (
        <ul className="flex flex-col gap-sm">
          {filteredProjects.map((project) => (
            <li key={project.id}>
              <ProjectRow project={project} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ScopeButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? "outline" : "ghost"}
      size="sm"
      aria-pressed={active}
      onClick={onClick}
      className={active ? "bg-card shadow-sm" : "text-muted-foreground"}
    >
      {children}
    </Button>
  );
}

function ProjectRow({ project }: { project: ProjectListProject }) {
  return (
    /*
      One link, stretched over the whole row by its own `after` layer. The reference draws a separate
      "Open" button and a row that is not itself a target; one target is better, and it keeps the link's
      accessible name to the Project's name rather than the whole row read as a sentence. The affordance on
      the right is therefore `aria-hidden`: it shows where the row goes without being a second thing to tab
      to and announce.
    */
    <div className="group relative flex flex-col gap-md rounded-xl border border-border bg-card p-md shadow-sm transition-colors hover:border-ring/60 hover:bg-accent/40 has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring/50 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-sm sm:items-center">
        {/*
          One tile, one tint, for every Project. The reference gives each row its own colour — emerald here,
          blue there — and DESIGN.md's discipline is that colour carries status and nothing else, so a
          per-project tint would be five verdicts about nothing.
        */}
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
          <FolderKanban className="size-5" aria-hidden="true" />
        </span>

        <div className="flex min-w-0 flex-col gap-2xs">
          <div className="flex flex-wrap items-center gap-xs">
            <h2 className="text-title-lg font-semibold">
              <Link
                href={`/projects/${project.id}`}
                className="after:absolute after:inset-0 focus-visible:outline-none group-hover:text-reference"
              >
                {project.name}
              </Link>
            </h2>
            <RoleLabel role={project.role} />
          </div>

          {project.description && (
            <p className="line-clamp-1 text-body-sm text-muted-foreground">{project.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-x-sm gap-y-2xs text-body-sm text-muted-foreground">
            <span className="flex items-center gap-2xs">
              <Users className="size-3.5" aria-hidden="true" />
              <span className="tabular-nums">
                {project.memberCount} {project.memberCount === 1 ? "member" : "members"}
              </span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">Started {formatDay(project.createdAt)}</span>
          </div>
        </div>
      </div>

      <span
        aria-hidden="true"
        className="flex w-fit shrink-0 items-center gap-2xs rounded-lg border border-border bg-card px-sm py-xs text-body-sm font-medium text-foreground shadow-sm transition-colors group-hover:text-reference"
      >
        Open
        <ArrowRight className="size-4" />
      </span>
    </div>
  );
}
