import { expect, test } from "@playwright/test";

const formats = [
  { name: "desktop", width: 1440, height: 1000, compact: false, reduced: false },
  { name: "phone", width: 390, height: 844, compact: true, reduced: false },
  { name: "landscape", width: 844, height: 390, compact: false, reduced: true },
];

for (const format of formats) {
  test(`notices remain readable in their column (${format.name})`, async ({ page }) => {
    await page.setViewportSize({ width: format.width, height: format.height });
    await page.emulateMedia({ reducedMotion: format.reduced ? "reduce" : "no-preference" });
    await page.goto("/dev/mobile?specimen=narration-expanded&frame=1&locale=en");
    const column = page.locator(`[data-slot="${format.compact ? "narration" : "narration-text"}"]`);
    const notices = column.locator(".narration-item");
    await expect(notices).toHaveCount(format.compact ? 5 : 2);
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
      await expect(above).toHaveCount(0);
      await expect(below).toHaveCount(0);
      const lane = (await column.boundingBox())!;
      for (const notice of await notices.all()) {
        const bounds = (await notice.boundingBox())!;
        expect(bounds.y).toBeGreaterThanOrEqual(lane.y - 1);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(lane.y + lane.height + 1);
      }
    }
  });
}

test("the bottom-left hand selection leaves notices readable and can reveal the hand on a tall tablet", async ({
  page,
}) => {
  await page.setViewportSize({ width: 906, height: 972 });
  await page.goto("/dev/mobile?specimen=narration-hand-selection&frame=1&locale=en");
  const column = page.locator('[data-slot="narration-text"]');
  const notices = column.locator(".narration-item");
  await expect(notices).toHaveCount(2);
  const lane = (await column.boundingBox())!;
  for (const notice of await notices.all()) {
    const bounds = (await notice.boundingBox())!;
    expect(bounds.y).toBeGreaterThanOrEqual(lane.y - 1);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(lane.y + lane.height + 1);
  }
  const prompt = (await page.locator('.board-prompt[data-variant="selection"]').boundingBox())!;
  const hand = page.getByTestId("hand");
  expect(lane.y + lane.height).toBeLessThanOrEqual(prompt.y);
  expect(prompt.x).toBeCloseTo(8, 0);
  expect(prompt.y + prompt.height).toBeCloseTo(972 - 8, 0);
  await page.getByRole("button", { name: "View board", exact: true }).click();
  await expect(page.getByRole("button", { name: "Return to decision", exact: true })).toBeVisible();
  const firstCard = hand.locator(".game-hand-card").first();
  await firstCard.locator(".game-hand-card__inspect").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await firstCard.press("Enter");
  await expect(firstCard).toHaveAttribute("aria-pressed", "true");
});

for (const viewport of [
  { width: 1440, height: 600 },
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
    await expect(notices).toHaveCount(2);
    await expect(page.getByRole("button", { name: "Use", exact: true })).toBeAttached();
    const lane = (await column.boundingBox())!;
    for (const notice of await notices.all()) {
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

test("a single mobile effect is fully visible below its close control without phantom scroll buttons", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dev/mobile?specimen=narration-single&frame=1&locale=en");
  await page.locator(".narration-peek").click();
  const column = page.locator('[data-slot="narration"]');
  const notice = column.locator(".match-notice");
  await expect(notice).toBeVisible();
  await expect(column.locator(".narration-slot__more")).toHaveCount(0);
  const lane = (await column.boundingBox())!;
  const bounds = (await notice.boundingBox())!;
  const close = (await column.locator(".narration-slot__peek").boundingBox())!;
  expect(close.y + close.height).toBeLessThanOrEqual(bounds.y);
  expect(bounds.x).toBeGreaterThanOrEqual(lane.x);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(lane.y + lane.height + 1);
  expect(await column.evaluate((element) => element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1);
});

test("long effect notices stay above an operable decision on a short desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 600 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dev/mobile?specimen=narration-decision&frame=1&locale=en");
  const column = page.locator('[data-slot="narration-text"]');
  const notices = column.locator(".match-notice");
  await expect(notices).toHaveCount(2);
  await notices.evaluateAll((elements) => {
    for (const notice of elements) {
      const copy = notice.querySelector(".match-notice__copy")!;
      const clause = copy.querySelector(".match-notice__text") ?? copy.appendChild(document.createElement("p"));
      clause.textContent = "A long printed effect remains available to read. ".repeat(50);
    }
  });
  await expect
    .poll(async () => {
      const lane = (await column.boundingBox())!;
      const prompt = (await page.locator(".board-prompt").boundingBox())!;
      return prompt.y - (lane.y + lane.height);
    })
    .toBeGreaterThanOrEqual(8);
  for (const notice of await notices.all()) {
    const bounds = (await notice.boundingBox())!;
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.y + bounds.height).toBeLessThan(600);
    expect(await notice.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
    await notice.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    expect(await notice.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  }
  await page.getByRole("button", { name: "Use", exact: true }).click();
});
