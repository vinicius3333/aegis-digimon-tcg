import { expect, type Page } from "@playwright/test";

export async function expectBoardNoticesClear(page: Page) {
  const notice = page.locator(".narration-peek, .match-notice").first();
  const status = page.getByTestId("opponent-selecting-pill");
  await expect(notice).toBeVisible();
  await expect(status).toBeVisible();
  const noticeBox = (await notice.boundingBox())!;
  const statusBox = (await status.boundingBox())!;
  expect(statusBox.y + statusBox.height).toBeLessThanOrEqual(noticeBox.y + 1);
  for (const utility of await page.locator('[class*="game-utility-slot--opp-"]').all()) {
    const box = (await utility.boundingBox())!;
    for (const overlay of [noticeBox, statusBox]) {
      const intersection =
        Math.max(0, Math.min(box.x + box.width, overlay.x + overlay.width) - Math.max(box.x, overlay.x)) *
        Math.max(0, Math.min(box.y + box.height, overlay.y + overlay.height) - Math.max(box.y, overlay.y));
      expect(intersection, `opponent utility ${await utility.getAttribute("class")} overlaps notice/status`).toBe(0);
    }
  }
  const viewport = page.viewportSize()!;
  for (const card of await page.locator(".game-hand-card").all()) {
    const box = (await card.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
}
