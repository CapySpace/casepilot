import { expect, test } from "@playwright/test";

import { MAXIMUM_BUILD_NUMBER_LENGTH, MAXIMUM_DESCRIPTION_LENGTH } from "@/lib/builds/limits";

import { signedInUser } from "../support/clients";
import { createBuild } from "../support/builds";
import { signInAndLand } from "../support/flows";
import { createProject, projectWithMember } from "../support/projects";
import { createRelease } from "../support/releases";

/**
 * Adding a Build from Release Details, the Build list it appears in, and Build Details on its own.
 *
 * Seeding a Build runs through `createBuild`, the same insert the Server Action performs — the caller
 * must already be a Member of the Project that owns the Release, exactly as the real path requires.
 */

test("adding a Build from Release Details shows it immediately in the list", async ({ page }) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const release = await createRelease(anna, project, "1.0.0");
  await signInAndLand(page, anna);

  await page.goto(`/projects/${project}/releases/${release}`);
  await expect(page.getByText("No builds yet")).toBeVisible();

  await page.getByRole("button", { name: "Add Build" }).click();
  await page.getByLabel("Build Number").fill("100");
  await page.getByLabel("Description").fill("Nightly regression run.");
  await page.getByRole("button", { name: "Add Build" }).last().click();

  await expect(page.getByRole("link", { name: "Build 100" })).toBeVisible();
  await expect(page.getByText("No builds yet")).toHaveCount(0);
  // The form closed on success: there is nothing left to add against this attempt.
  await expect(page.getByLabel("Build Number")).toHaveCount(0);
});

test("a Member who is not the Project's Owner can also add a Build", async ({ page }) => {
  const anna = await signedInUser();
  const peter = await signedInUser();
  const project = await projectWithMember(anna, peter, "Mobile Banking App");
  const release = await createRelease(anna, project, "1.0.0");
  await signInAndLand(page, peter);

  await page.goto(`/projects/${project}/releases/${release}`);
  await page.getByRole("button", { name: "Add Build" }).click();
  await page.getByLabel("Build Number").fill("200");
  await page.getByRole("button", { name: "Add Build" }).last().click();

  await expect(page.getByRole("link", { name: "Build 200" })).toBeVisible();
});

test("the Build list shows every Build under a Release, newest first", async ({ page }) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const release = await createRelease(anna, project, "1.0.0");
  await createBuild(anna, release, "100");
  await createBuild(anna, release, "101");
  await signInAndLand(page, anna);

  await page.goto(`/projects/${project}/releases/${release}`);

  await expect(page.getByRole("link", { name: "Build 100" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Build 101" })).toBeVisible();
  await expect(page.getByText("2", { exact: true })).toBeVisible();

  // Most recently created first, the same ordering `listReleases` uses for its own list.
  const list = page.getByRole("list", { name: "Builds" });
  await expect(list.getByRole("link")).toHaveText(["Build 101", "Build 100"]);
});

test("adding a second Build closes the form again", async ({ page }) => {
  // Guards against comparing something that reads the same across two successes — the same bug
  // `release-details.tsx`'s own state-identity comment describes for editing a Release.
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const release = await createRelease(anna, project, "1.0.0");
  await signInAndLand(page, anna);
  await page.goto(`/projects/${project}/releases/${release}`);

  await page.getByRole("button", { name: "Add Build" }).click();
  await page.getByLabel("Build Number").fill("100");
  await page.getByRole("button", { name: "Add Build" }).last().click();
  await expect(page.getByRole("link", { name: "Build 100" })).toBeVisible();

  await page.getByRole("button", { name: "Add Build" }).click();
  await page.getByLabel("Build Number").fill("101");
  await page.getByRole("button", { name: "Add Build" }).last().click();

  await expect(page.getByRole("link", { name: "Build 101" })).toBeVisible();
  await expect(page.getByLabel("Build Number")).toHaveCount(0);
});

test("a Build with a number already used under the same Release is refused", async ({ page }) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const release = await createRelease(anna, project, "1.0.0");
  await createBuild(anna, release, "100");
  await signInAndLand(page, anna);

  await page.goto(`/projects/${project}/releases/${release}`);
  await page.getByRole("button", { name: "Add Build" }).click();
  await page.getByLabel("Build Number").fill("100");
  await page.getByRole("button", { name: "Add Build" }).last().click();

  await expect(
    page.getByText(/100 is already used by a build under this release/),
  ).toBeVisible();
  // Still one row, not two: nothing was actually created.
  await expect(page.getByRole("link", { name: "Build 100" })).toHaveCount(1);
});

test("the same build number used under a different Release causes no conflict", async ({ page }) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const releaseA = await createRelease(anna, project, "1.0.0");
  const releaseB = await createRelease(anna, project, "2.0.0");
  await createBuild(anna, releaseA, "100");
  await signInAndLand(page, anna);

  await page.goto(`/projects/${project}/releases/${releaseB}`);
  await page.getByRole("button", { name: "Add Build" }).click();
  await page.getByLabel("Build Number").fill("100");
  await page.getByRole("button", { name: "Add Build" }).last().click();

  await expect(page.getByRole("link", { name: "Build 100" })).toBeVisible();
});

test.describe("what the Add Build form refuses", () => {
  test("a build number that is blank, or only whitespace", async ({ page }) => {
    const anna = await signedInUser();
    const project = await createProject(anna, "Mobile Banking App");
    const release = await createRelease(anna, project, "1.0.0");
    await signInAndLand(page, anna);
    await page.goto(`/projects/${project}/releases/${release}`);

    await page.getByRole("button", { name: "Add Build" }).click();
    await page.getByRole("button", { name: "Add Build" }).last().click();
    await expect(page.getByText("Give the build a number.")).toBeVisible();

    await page.getByLabel("Build Number").fill("    ");
    await page.getByRole("button", { name: "Add Build" }).last().click();
    await expect(page.getByText("Give the build a number.")).toBeVisible();
  });

  test("a build number past the limit, keeping what was typed", async ({ page }) => {
    const anna = await signedInUser();
    const project = await createProject(anna, "Mobile Banking App");
    const release = await createRelease(anna, project, "1.0.0");
    await signInAndLand(page, anna);
    await page.goto(`/projects/${project}/releases/${release}`);

    const tooLong = "1".repeat(MAXIMUM_BUILD_NUMBER_LENGTH + 1);
    await page.getByRole("button", { name: "Add Build" }).click();
    await page.getByLabel("Build Number").fill(tooLong);
    await page.getByRole("button", { name: "Add Build" }).last().click();

    await expect(page.getByText(`at most ${MAXIMUM_BUILD_NUMBER_LENGTH} characters`)).toBeVisible();
    await expect(page.getByLabel("Build Number")).toHaveValue(tooLong);
  });

  test("a description past the limit", async ({ page }) => {
    const anna = await signedInUser();
    const project = await createProject(anna, "Mobile Banking App");
    const release = await createRelease(anna, project, "1.0.0");
    await signInAndLand(page, anna);
    await page.goto(`/projects/${project}/releases/${release}`);

    await page.getByRole("button", { name: "Add Build" }).click();
    await page.getByLabel("Build Number").fill("100");
    await page.getByLabel("Description").fill("a".repeat(MAXIMUM_DESCRIPTION_LENGTH + 1));
    await page.getByRole("button", { name: "Add Build" }).last().click();

    await expect(page.getByText(`at most ${MAXIMUM_DESCRIPTION_LENGTH} characters`)).toBeVisible();
    await expect(page.getByLabel("Build Number")).toHaveValue("100");
  });

  // Unlike Release creation's own page, "Add Build" is a form toggled open by a client `onClick` —
  // the same shape `ReleaseDetails`' own "Edit" control has for editing a Release. Neither has a
  // no-JavaScript path to reach it, and ticket 03 did not ask for one for editing either; this is a
  // deliberately JS-enhanced reveal, not a form whose *submission* skips progressive enhancement — the
  // hidden `projectId`/`releaseId` fields and the unbound Server Action still mean the underlying POST
  // itself works without a client bundle, once reached.
});

test.describe("Build Details", () => {
  test("shows the Build's number and description, and that test cases are not here yet", async ({
    page,
  }) => {
    const anna = await signedInUser();
    const project = await createProject(anna, "Mobile Banking App");
    const release = await createRelease(anna, project, "1.0.0");
    const build = await createBuild(anna, release, "100", "Nightly regression run.");
    await signInAndLand(page, anna);

    await page.goto(`/projects/${project}/releases/${release}/builds/${build}`);

    await expect(page.getByRole("heading", { level: 1, name: "Build 100" })).toBeVisible();
    await expect(page.getByText("Nightly regression run.")).toBeVisible();
    await expect(page.getByText("Test cases are not here yet")).toBeVisible();
  });

  test("clicking a Build in the list opens its Details", async ({ page }) => {
    const anna = await signedInUser();
    const project = await createProject(anna, "Mobile Banking App");
    const release = await createRelease(anna, project, "1.0.0");
    const build = await createBuild(anna, release, "100");
    await signInAndLand(page, anna);

    await page.goto(`/projects/${project}/releases/${release}`);
    await page.getByRole("link", { name: "Build 100" }).click();

    await expect(page).toHaveURL(`/projects/${project}/releases/${release}/builds/${build}`);
  });

  test("there is no way to edit a Build's number or description", async ({ page }) => {
    const anna = await signedInUser();
    const project = await createProject(anna, "Mobile Banking App");
    const release = await createRelease(anna, project, "1.0.0");
    const build = await createBuild(anna, release, "100", "Original description.");
    await signInAndLand(page, anna);

    await page.goto(`/projects/${project}/releases/${release}/builds/${build}`);

    await expect(page.getByRole("button", { name: "Edit" })).toHaveCount(0);
    await expect(page.getByRole("textbox")).toHaveCount(0);
  });

  test("a non-member finds nothing at a Build's own URL", async ({ page }) => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await createProject(anna, "Anna's Secret Project");
    const release = await createRelease(anna, project, "1.0.0");
    const build = await createBuild(anna, release, "100");
    await signInAndLand(page, peter);

    const response = await page.goto(`/projects/${project}/releases/${release}/builds/${build}`);
    expect(response?.status()).toBe(404);
    await expect(page.getByText("Build 100")).toHaveCount(0);
  });

  test("a Build does not render under a Release it does not belong to", async ({ page }) => {
    const anna = await signedInUser();
    const project = await createProject(anna, "Mobile Banking App");
    const releaseA = await createRelease(anna, project, "1.0.0");
    const releaseB = await createRelease(anna, project, "2.0.0");
    const buildInA = await createBuild(anna, releaseA, "100");
    await signInAndLand(page, anna);

    // Anna is a Member of the Project either way, so row-level security alone would let this read
    // through — the URL's own Release id is what has to refuse it.
    const response = await page.goto(
      `/projects/${project}/releases/${releaseB}/builds/${buildInA}`,
    );
    expect(response?.status()).toBe(404);
  });
});
