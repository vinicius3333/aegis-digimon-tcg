import { test, expect } from "@playwright/test";

test("GitHub #5390: Available presets display Olympos XII in the lobby picker", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("aegis:locale", "en"));
  await page.goto("/e2e/deck-picker.html");
  await page.locator('input[name="deckSearch"]').fill("Olympos XII");
  await expect(page.getByRole("heading", { name: "Olympos XII", exact: true })).toHaveCount(2);
  await expect(page.getByRole("heading", { name: "Olympus XII", exact: true })).toHaveCount(0);
  // Search must find the corrected archetype among presets available in the current card pool.
  await page.locator('input[name="deckSearch"]').fill("Olympus XII");
  await expect(page.getByRole("heading", { name: "Olympos XII", exact: true })).toHaveCount(0);
});
