import { expect, test } from "@playwright/test";

test("home presents independent community positioning", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /ALCL/i }).first()).toBeVisible();
  await expect(
    page.getByText(
      "This tournament is not affiliated with or sponsored by Electronic Arts Inc.",
    ).first(),
  ).toBeVisible();
});

test("registration never asks for EA credentials", async ({ page }) => {
  await page.goto("/register/team");
  await expect(page.getByText(/never ask for your EA password/i)).toBeVisible();
  await expect(page.getByLabel(/password/i)).toHaveCount(0);
});

test("core public routes render on mobile", async ({ page }) => {
  for (const route of ["/tournaments", "/standings", "/teams", "/players"]) {
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
  }
});
