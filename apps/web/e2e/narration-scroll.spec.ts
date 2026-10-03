import { expect, test } from "@playwright/test";

const formats = [
  { name: "desktop", width: 1440, height: 1000, compact: false, reduced: false },
  { name: "phone", width: 390, height: 844, compact: true, reduced: false },
  { name: "landscape", width: 844, height: 390, compact: false, reduced: true },
];

for (const format of formats) {
  test(`notice buttons reveal the queued toasts in both directions (${format.name})`, async ({ page }) => {
    await page.setViewportSize({ width: format.width, height: format.height });
    await page.emulateMedia({ reducedMotion: format.reduced ? "reduce" : "no-preference" });
    await page.goto("/dev/mobile?specimen=narration-expanded&frame=1&locale=en");
    const column = page.locator(`[data-slot="${format.compact ? "narration" : "narration-text"}"]`);
    await expect(column.locator(".narration-item")).toHaveCount(format.compact ? 5 : 3);
    const above = column.getByRole("button", { name: "Show more notices above" });
    const below = column.getByRole("button", { name: "Show more notices below" });
    const position = () => column.evaluate((element) => element.scrollTop);
    const initial = await position();

    if (format.compact) {
      await expect(below).toBeVisible();
      await below.click();
      await expect.poll(position).toBeGreaterThan(initial + 24);
      await expect(above).toBeVisible();
      const lower = await position();
      await above.click();
      await expect.poll(position).toBeLessThan(lower - 24);
      await expect(column.getByRole("button", { name: "Fold the notice back" })).toBeVisible();
    } else {
      await expect(above).toBeVisible();
      await above.click();
      await expect.poll(position).toBeLessThan(initial - 24);
      await expect(below).toBeVisible();
      const upper = await position();
      await below.click();
      await expect.poll(position).toBeGreaterThan(upper + 24);
      await expect(above).toBeVisible();
    }
  });
}

test("the notice lane and hand selection rail leave cards and inspection controls available on a tall tablet", async ({
  page,
}) => {
  await page.setViewportSize({ width: 906, height: 972 });
  await page.goto("/dev/mobile?specimen=narration-hand-selection&frame=1&locale=en");
  const column = page.locator('[data-slot="narration-text"]');
  const notices = column.locator(".narration-item");
  await expect(notices).toHaveCount(3);
  const lane = (await column.boundingBox())!;
  for (const notice of [notices.nth(1), notices.nth(2)]) {
    const bounds = (await notice.boundingBox())!;
    expect(bounds.y).toBeGreaterThanOrEqual(lane.y - 1);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(lane.y + lane.height + 1);
  }
  const prompt = (await page.locator('.board-prompt[data-variant="selection"]').boundingBox())!;
  const hand = page.getByTestId("hand");
  const handBounds = (await hand.boundingBox())!;
  expect(lane.y + lane.height).toBeLessThanOrEqual(prompt.y);
  expect(prompt.y + prompt.height).toBeLessThanOrEqual(handBounds.y);
  const firstCard = hand.locator(".game-hand-card").first();
  await firstCard.locator(".game-hand-card__inspect").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await firstCard.click();
  await expect(firstCard).toHaveAttribute("aria-pressed", "true");
});

for (const viewport of [
  { width: 1440, height: 760 },
  { width: 906, height: 972 },
]) {
  test(`two complete notices fit above a pending decision (${viewport.width} × ${viewport.height})`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/dev/mobile?specimen=narration-decision&frame=1&locale=en");
    const column = page.locator('[data-slot="narration-text"]');
    const notices = column.locator(".narration-item");
    await expect(notices).toHaveCount(3);
    await expect(page.getByRole("button", { name: "Use", exact: true })).toBeAttached();
    const lane = (await column.boundingBox())!;
    for (const notice of [notices.nth(1), notices.nth(2)]) {
      const bounds = (await notice.boundingBox())!;
      expect(bounds.y).toBeGreaterThanOrEqual(lane.y - 1);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(lane.y + lane.height + 1);
      await expect(notice).toHaveCSS("opacity", "1");
    }
    const prompt = (await page.locator(".board-prompt").boundingBox())!;
    expect(lane.y + lane.height).toBeLessThanOrEqual(prompt.y);
    await page.getByRole("button", { name: "Use", exact: true }).click();
    await expect(page.locator(".resolution-strip,.resolution-strip--folded,.narration-peek__chain")).toHaveCount(0);
  });
}
