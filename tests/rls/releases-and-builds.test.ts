import { describe, expect, it } from "vitest";

import { signedInUser } from "../support/clients";
import { createBuild } from "../support/builds";
import { createProject, projectWithMember } from "../support/projects";
import { createRelease } from "../support/releases";

describe("creating a Release", () => {
  it("is allowed for any Member of the Project, not only its Owner", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await projectWithMember(anna, peter);

    const release = await createRelease(peter, project, "1.0.0");

    const { data } = await anna.client.from("releases").select("version").eq("id", release).single();
    expect(data).toEqual({ version: "1.0.0" });
  });

  it("refuses a blank version", async () => {
    const anna = await signedInUser();
    const project = await createProject(anna);

    const { error } = await anna.client.from("releases").insert({ project_id: project, version: "   " });

    expect(error?.message).toContain("releases_version_not_blank");
  });

  it("refuses a second Release with a version already used in the same Project", async () => {
    const anna = await signedInUser();
    const project = await createProject(anna);
    await createRelease(anna, project, "1.0.0");

    const { error } = await anna.client.from("releases").insert({ project_id: project, version: "1.0.0" });

    expect(error?.message).toContain("releases_one_version_per_project");
  });

  it("allows the same version in a different Project", async () => {
    const anna = await signedInUser();
    const projectA = await createProject(anna, "Project A");
    const projectB = await createProject(anna, "Project B");
    await createRelease(anna, projectA, "1.0.0");

    const { error } = await anna.client.from("releases").insert({ project_id: projectB, version: "1.0.0" });

    expect(error).toBeNull();
  });
});

describe("a Project's Releases", () => {
  it("are absent from a non-member's reads", async () => {
    const anna = await signedInUser();
    const stranger = await signedInUser();
    const project = await createProject(anna);
    await createRelease(anna, project);

    const { data } = await stranger.client.from("releases").select("id");

    expect(data).toEqual([]);
  });

  it("cannot be created by a non-member", async () => {
    const anna = await signedInUser();
    const stranger = await signedInUser();
    const project = await createProject(anna);

    const { error } = await stranger.client.from("releases").insert({ project_id: project, version: "1.0.0" });

    expect(error?.code).toBe("42501");
  });
});

describe("editing a Release", () => {
  it("is allowed for any Member, not only the one who created it", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await projectWithMember(anna, peter);
    const release = await createRelease(anna, project, "1.0.0");

    const { data: before } = await anna.client
      .from("releases")
      .select("updated_at")
      .eq("id", release)
      .single();

    const { error } = await peter.client.from("releases").update({ version: "1.0.1" }).eq("id", release);
    expect(error).toBeNull();

    const { data: after } = await anna.client
      .from("releases")
      .select("version, updated_at")
      .eq("id", release)
      .single();

    expect(after?.version).toBe("1.0.1");
    expect(new Date(after!.updated_at).getTime()).toBeGreaterThan(new Date(before!.updated_at).getTime());
  });

  it("refuses a rename into a version already used elsewhere in the same Project", async () => {
    const anna = await signedInUser();
    const project = await createProject(anna);
    await createRelease(anna, project, "1.0.0");
    const release = await createRelease(anna, project, "2.0.0");

    const { error } = await anna.client.from("releases").update({ version: "1.0.0" }).eq("id", release);

    expect(error?.message).toContain("releases_one_version_per_project");
  });

  it("cannot be changed by a non-member", async () => {
    const anna = await signedInUser();
    const stranger = await signedInUser();
    const project = await createProject(anna);
    const release = await createRelease(anna, project, "1.0.0");

    await stranger.client.from("releases").update({ version: "9.9.9" }).eq("id", release);

    const { data } = await anna.client.from("releases").select("version").eq("id", release).single();
    expect(data).toEqual({ version: "1.0.0" });
  });

  it("cannot be deleted by anybody, since no delete policy exists", async () => {
    const anna = await signedInUser();
    const project = await createProject(anna);
    const release = await createRelease(anna, project);

    await anna.client.from("releases").delete().eq("id", release);

    const { data } = await anna.client.from("releases").select("id").eq("id", release).maybeSingle();
    expect(data).toEqual({ id: release });
  });
});

describe("creating a Build", () => {
  it("is allowed for any Member of the Project", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await projectWithMember(anna, peter);
    const release = await createRelease(anna, project);

    const build = await createBuild(peter, release, "100");

    const { data } = await anna.client.from("builds").select("build_number").eq("id", build).single();
    expect(data).toEqual({ build_number: "100" });
  });

  it("refuses a blank build number", async () => {
    const anna = await signedInUser();
    const project = await createProject(anna);
    const release = await createRelease(anna, project);

    const { error } = await anna.client.from("builds").insert({ release_id: release, build_number: " " });

    expect(error?.message).toContain("builds_build_number_not_blank");
  });

  it("refuses a second Build with a number already used under the same Release", async () => {
    const anna = await signedInUser();
    const project = await createProject(anna);
    const release = await createRelease(anna, project);
    await createBuild(anna, release, "100");

    const { error } = await anna.client.from("builds").insert({ release_id: release, build_number: "100" });

    expect(error?.message).toContain("builds_one_number_per_release");
  });

  it("allows the same build number under a different Release", async () => {
    const anna = await signedInUser();
    const project = await createProject(anna);
    const releaseA = await createRelease(anna, project, "1.0.0");
    const releaseB = await createRelease(anna, project, "2.0.0");
    await createBuild(anna, releaseA, "100");

    const { error } = await anna.client.from("builds").insert({ release_id: releaseB, build_number: "100" });

    expect(error).toBeNull();
  });
});

describe("a Project's Builds", () => {
  it("are absent from a non-member's reads", async () => {
    const anna = await signedInUser();
    const stranger = await signedInUser();
    const project = await createProject(anna);
    const release = await createRelease(anna, project);
    await createBuild(anna, release);

    const { data } = await stranger.client.from("builds").select("id");

    expect(data).toEqual([]);
  });

  it("cannot be created by a non-member", async () => {
    const anna = await signedInUser();
    const stranger = await signedInUser();
    const project = await createProject(anna);
    const release = await createRelease(anna, project);

    const { error } = await stranger.client
      .from("builds")
      .insert({ release_id: release, build_number: "100" });

    expect(error?.code).toBe("42501");
  });

  it("cannot be changed by a non-member", async () => {
    const anna = await signedInUser();
    const stranger = await signedInUser();
    const project = await createProject(anna);
    const release = await createRelease(anna, project);
    const build = await createBuild(anna, release, "100", "Original description.");

    await stranger.client.from("builds").update({ description: "Edited." }).eq("id", build);

    const { data } = await anna.client.from("builds").select("description").eq("id", build).single();
    expect(data).toEqual({ description: "Original description." });
  });

  it("cannot be reached by a non-member who has the Build's own id", async () => {
    const anna = await signedInUser();
    const stranger = await signedInUser();
    const project = await createProject(anna);
    const release = await createRelease(anna, project);
    const build = await createBuild(anna, release);

    // The membership check is asked about the Release's Project, one join away from the Build — this
    // proves that reaching for the Build directly by id does not skip it.
    const { data } = await stranger.client.from("builds").select("id").eq("id", build);

    expect(data).toEqual([]);
  });
});

describe("a Build, once created", () => {
  it("cannot be edited by anybody, including its creator — Builds are create-and-view only", async () => {
    const anna = await signedInUser();
    const project = await createProject(anna);
    const release = await createRelease(anna, project);
    const build = await createBuild(anna, release, "100", "Original description.");

    await anna.client.from("builds").update({ description: "Edited." }).eq("id", build);

    const { data } = await anna.client.from("builds").select("description").eq("id", build).single();
    expect(data).toEqual({ description: "Original description." });
  });

  it("cannot be deleted by anybody, since no delete policy exists", async () => {
    const anna = await signedInUser();
    const project = await createProject(anna);
    const release = await createRelease(anna, project);
    const build = await createBuild(anna, release);

    await anna.client.from("builds").delete().eq("id", build);

    const { data } = await anna.client.from("builds").select("id").eq("id", build).maybeSingle();
    expect(data).toEqual({ id: build });
  });
});
