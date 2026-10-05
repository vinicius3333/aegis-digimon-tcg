import { test, expect } from "./fixtures";
import { GamePage } from "./game-page";
import type { Locator } from "@playwright/test";

async function expectReadableCount(security: Locator) {
  const count = security.locator(".game-security-shield__count");
  await expect(count).toHaveText("4");
  await expect(count).toBeVisible();
  // DOM visibility alone misses a count wholly outside its parent's clip-path.
  await expect
    .poll(
      () =>
        security.evaluate((shield) => {
          const badge = shield.querySelector(".game-security-shield__count")!;
          const rect = badge.getBoundingClientRect();
          if (rect.left < 0 || rect.right > innerWidth || rect.top < 0 || rect.bottom > innerHeight) return false;
          if (getComputedStyle(shield).clipPath === "none") return true;
          const parent = shield.getBoundingClientRect();
          return (
            rect.left >= parent.left &&
            rect.right <= parent.right &&
            rect.top >= parent.top &&
            rect.bottom <= parent.bottom
          );
        }),
      { timeout: 3000 },
    )
    .toBe(true);
}

for (const viewport of [
  { width: 1440, height: 700 },
  { width: 844, height: 390 },
  { width: 1440, height: 1000 },
  { width: 1100, height: 800 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 320, height: 640 },
]) {
  test(`Discord 1556677140253249656 keeps face-up security counts readable at ${viewport.width}x${viewport.height}`, async ({
    page,
    match,
  }) => {
    await page.setViewportSize(viewport);
    await match.start("security-count");
    await new GamePage(page).endBreeding();
    const security = page.getByRole("button", { name: /^your security · 4/i });
    await expect(security).toBeVisible();
    await expect(security.locator(".game-security-card--revealed")).toHaveCount(1);
    await expectReadableCount(security);
    await expectReadableCount(page.getByRole("button", { name: /^opponent security · 4/i }));
    await security.click();
    await expect(page.getByRole("dialog")).toContainText("1 face-up of 4 cards");
    await page.getByRole("button", { name: /^close$/i }).click();
  });
}

test("Discord 1556677140253249656 keeps both counts after Invisimon reveals the opponent security", async ({
  page,
  match,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await match.start("security-count");
  await new GamePage(page).endBreeding();
  await page
    .getByTestId("hand")
    .getByRole("img", { name: /^invisimon$/i })
    .click();
  await page.getByRole("button", { name: /^digivolve$/i }).click();
  await page.getByRole("button", { name: /^metalgreymon$/i }).click();
  await page.getByRole("button", { name: /^2 cards$/i }).click();
  await expect.poll(async () => (await match.snapshot()).players[1]!.securityView[0]?.faceUp).toBe(true);
  await expect.poll(async () => (await match.snapshot()).pendingDecision).toBeUndefined();
  const yours = page.getByRole("button", { name: /^your security · 4/i });
  const theirs = page.getByRole("button", { name: /^opponent security · 4/i });
  await expect(theirs.locator(".game-security-card--revealed")).toHaveCount(1);
  await expectReadableCount(yours);
  await expectReadableCount(theirs);
  await theirs.click();
  await expect(page.getByRole("dialog")).toContainText("1 face-up of 4 cards");
  await page.getByRole("button", { name: /^close$/i }).click();
  await testInfo.attach("face-up-security-count", { body: await page.screenshot(), contentType: "image/png" });
});
