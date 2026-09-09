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

test("player registration never asks for EA credentials", async ({ page }) => {
  await page.goto("/register");
  await expect(page.getByText(/never request an EA password/i)).toBeVisible();
});

test("register button opens player signup", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /^Register/i }).first().click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByRole("heading", { name: /Create your player account/i })).toBeVisible();
});

test("legacy team registration URL redirects to player signup", async ({ page }) => {
  await page.goto("/register/team");
  await expect(page).toHaveURL(/\/register$/);
});

test("core public routes render on mobile", async ({ page }) => {
  for (const route of ["/tournaments", "/standings", "/teams", "/players"]) {
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
  }
});
