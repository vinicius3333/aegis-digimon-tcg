import { expect, type Page } from "@playwright/test";

type Box = { x: number; y: number; width: number; height: number };

function overlapArea(a: Box, b: Box): number {
  return (
    Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
    Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y))
  );
}

/**
 * Notices and the waiting status never overlap each other or leave the viewport.
 * Pass `utilitiesClear` where the layout reserves room beside the opponent's
 * utilities; portrait phones float notices over the field instead.
 */
export async function expectBoardNoticesClear(page: Page, { utilitiesClear }: { utilitiesClear: boolean }) {
  const notice = page.locator(".narration-peek, .match-notice").first();
  const status = page.getByTestId("opponent-selecting-pill");
  await expect(notice).toBeVisible();
  await expect(status).toBeVisible();
  const noticeBox = (await notice.boundingBox())!;
  const statusBox = (await status.boundingBox())!;
  expect(statusBox.y + statusBox.height).toBeLessThanOrEqual(noticeBox.y + 1);
  if (utilitiesClear) {
    for (const utility of await page.locator('[class*="game-utility-slot--opp-"]').all()) {
      const box = (await utility.boundingBox())!;
      for (const overlay of [noticeBox, statusBox]) {
        expect(
          overlapArea(box, overlay),
          `opponent utility ${await utility.getAttribute("class")} overlaps notice/status`,
        ).toBe(0);
      }
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

export async function opponentUtilityBoxes(page: Page): Promise<Box[]> {
  const boxes: Box[] = [];
  for (const utility of await page.locator('[class*="game-utility-slot--opp-"]').all()) {
    boxes.push((await utility.boundingBox())!);
  }
  return boxes;
}
