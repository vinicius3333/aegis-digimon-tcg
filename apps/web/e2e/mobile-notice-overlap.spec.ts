import { expect, test } from "@playwright/test";
import { expectBoardNoticesClear, opponentUtilityBoxes } from "./board-notice-geometry";

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1024, height: 768 },
]) {
  const phone = viewport.width < 1024;

  for (const timer of [false, true]) {
    test(`opponent narration, selection status and utilities stay separate at ${viewport.width}px${timer ? " with a match timer" : ""}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`/dev/mobile?specimen=board-opponent-narration&frame=1&locale=en${timer ? "&timer=on" : ""}`);
      await expect(page.getByTestId("opponent-selecting-pill")).toBeVisible();
      await expect(page.locator(".narration-peek, .match-notice")).toHaveCount(0);
      const utilitiesBefore = await opponentUtilityBoxes(page);

      if (timer) {
        // The opponent's decision opens no sheet, so the header clocks stay put.
        await expect(page.locator(".game-decision-clocks")).toHaveCount(0);
        const bar = (await page.locator(".game-opponent-bar").boundingBox())!;
        const clock = (await page.getByTestId("opponent-match-timer").boundingBox())!;
        expect(clock.y).toBeGreaterThanOrEqual(bar.y - 1);
        expect(clock.y + clock.height).toBeLessThanOrEqual(bar.y + bar.height + 1);
      }

      await page.getByRole("button", { name: "Show opponent effect", exact: true }).click();
      await expectBoardNoticesClear(page, { utilitiesClear: !phone });
      if (phone) {
        // Notices float over the field: nothing underneath moves when one arrives.
        expect(await opponentUtilityBoxes(page)).toEqual(utilitiesBefore);
        await page.locator(".narration-peek").click();
        await expect(page.locator(".match-notice")).toBeVisible();
        expect(await opponentUtilityBoxes(page)).toEqual(utilitiesBefore);
        await page.locator(".narration-slot__peek").click();
        await expectBoardNoticesClear(page, { utilitiesClear: false });
      }
    });
  }
}
