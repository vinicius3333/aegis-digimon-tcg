import { expect, test } from "@playwright/test";
import { expectBoardNoticesClear } from "./board-notice-geometry";

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1024, height: 768 },
]) {
  test(`opponent narration, selection status and utilities stay separate at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/dev/mobile?specimen=board-opponent-narration&frame=1&locale=en");
    await expect(page.getByTestId("opponent-selecting-pill")).toBeVisible();
    await expect(page.locator(".narration-peek, .match-notice")).toHaveCount(0);
    await page.getByRole("button", { name: "Show opponent effect", exact: true }).click();
    await expectBoardNoticesClear(page);
    if (viewport.width === 390) {
      await page.locator(".narration-peek").click();
      await expect(page.locator(".match-notice")).toBeVisible();
      await page.locator(".narration-slot__peek").click();
      await expectBoardNoticesClear(page);
    }
  });
}
