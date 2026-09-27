import { expect, test } from "@playwright/test";

/**
 * The first test in the repository. It exists to prove the browser runner is wired up — it serves the
 * application, loads a page, and reads what a User would read. Every flow test from ticket 02 onward
 * copies this shape.
 *
 * Replace it once there is real behaviour to assert. There is none in ticket 01 by design.
 */
test("the application serves a page", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("CasePilot");
});
