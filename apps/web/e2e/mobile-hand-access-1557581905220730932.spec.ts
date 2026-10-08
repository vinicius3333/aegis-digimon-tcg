import { expect, test, type Locator, type Page } from "@playwright/test";

// Uses the production GameScreen/CSS without starting a second server. The
// coordinator also checks the actual Cool Boy transaction in the live arena.
async function expectHandAccess(rail: Locator, card: Locator) {
  await card.scrollIntoViewIfNeeded();
  await card.focus();
  await expect(async () => {
    const panel = (await rail.boundingBox())!;
    const bounds = (await card.boundingBox())!;
    expect(panel.y).toBeGreaterThanOrEqual(0);
    expect(panel.y + panel.height).toBeLessThanOrEqual(bounds.y);
    const hits = await card.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const points = [
        [0.5, 0.5],
        [0.15, 0.15],
        [0.85, 0.15],
        [0.15, 0.85],
        [0.85, 0.85],
      ];
      return points.map(([x, y]) => {
        // The desktop fan can extend below the viewport. Sample its visible
        // corners while retaining the exact physical center for the pick probe.
        const left = Math.max(0, rect.left);
        const right = Math.min(innerWidth, rect.right);
        const top = Math.max(0, rect.top);
        const bottom = Math.min(innerHeight, rect.bottom);
        const center = x === 0.5 && y === 0.5;
        const hit = document.elementFromPoint(
          center ? rect.left + rect.width / 2 : left + (right - left) * x!,
          center ? rect.top + rect.height / 2 : top + (bottom - top) * y!,
        );
        return {
          card:
            hit?.closest("[data-hand-instance-id]")?.getAttribute("data-hand-instance-id") ??
            hit?.closest("[data-hand-hover-instance-id]")?.getAttribute("data-hand-hover-instance-id"),
          rail: Boolean(hit?.closest('[data-variant="selection"]')),
        };
      });
    });
    expect(hits.every((hit) => !hit.rail)).toBe(true);
    expect(hits[0]!.card).toBe(await card.getAttribute("data-hand-instance-id"));
    // Fan corners may expose a sibling, whose ID we preserve in the probe.
    // Every sampled point must still hit the hand rather than the rail.
    expect(hits.every((hit) => hit.card !== undefined && hit.card !== null)).toBe(true);
  }).toPass({ timeout: 3000 });
}

async function cardBodyPoint(card: Locator) {
  const point = await card.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const id = element.getAttribute("data-hand-instance-id");
    for (const [fx, fy] of [
      [0.5, 0.5],
      [0.5, 0.8],
      [0.75, 0.8],
      [0.25, 0.8],
    ]) {
      const x = Math.round(rect.left + rect.width * fx!);
      const y = Math.round(rect.top + rect.height * fy!);
      const readButtons = [...element.querySelectorAll("button")].map((button) =>
        button.getBoundingClientRect().toJSON(),
      );
      // Chromium touch targeting can favor a nearby rounded Read control even
      // when the exact pixel is image. Keep the action inside the card body.
      if (
        readButtons.some(
          (button) => x >= button.left - 8 && x <= button.right + 8 && y >= button.top - 8 && y <= button.bottom + 8,
        )
      )
        continue;
      const hits = [-2, 0, 2].flatMap((dx) => [-2, 0, 2].map((dy) => document.elementFromPoint(x + dx, y + dy)));
      if (
        hits.some(
          (hit) =>
            !hit ||
            hit.closest("[data-hand-instance-id]") !== element ||
            hit.closest("button, a, input, select, textarea") ||
            (hit.closest('[role="button"]') && hit.closest('[role="button"]') !== element),
        )
      )
        continue;
      const hit = document.elementFromPoint(x, y)!;
      return { x, y, id, tag: hit.tagName, className: hit.getAttribute("class"), readButtons };
    }
    return null;
  });
  expect(point, "Exact exposed card body must be tappable").not.toBeNull();
  return point!;
}

test.describe("coarse touch hand access", () => {
  test.use({ hasTouch: true });

  test("Discord 1557581905220730932: a real touch selects and deselects the exposed instance after folding", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => localStorage.setItem("aegis:locale", "en"));
    await page.goto("/dev/effect-prompts?case=select-hand&controls=0");
    const rail = page.locator('.board-prompt[data-variant="selection"]');
    await expect(rail).toBeVisible();
    const id = await page
      .locator(".game-hand-card--pickable[data-hand-instance-id]")
      .first()
      .getAttribute("data-hand-instance-id");
    const card = page.locator(`[data-hand-instance-id="${id}"]`);
    expect(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)).toBe(true);
    await expectHandAccess(rail, card);
    let point = await cardBodyPoint(card);
    await testInfo.attach("portrait-card-body-target", {
      body: JSON.stringify(point),
      contentType: "application/json",
    });
    await page.touchscreen.tap(point.x, point.y);
    await expect(card).toHaveAttribute("aria-pressed", "true");
    await page.setViewportSize({ width: 844, height: 390 });
    await expectHandAccess(rail, card);
    point = await cardBodyPoint(card);
    await testInfo.attach("folded-card-body-target", { body: JSON.stringify(point), contentType: "application/json" });
    await page.touchscreen.tap(point.x, point.y);
    await expect(card).toHaveAttribute("aria-pressed", "false");
    await expect(rail).toBeVisible();
  });
});

async function pointerPick(page: Page, card: Locator) {
  const bounds = (await card.boundingBox())!;
  await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
}

for (const viewport of [
  { width: 902, height: 550 },
  { width: 844, height: 390 },
  { width: 390, height: 844 },
  { width: 360, height: 640 },
  { width: 768, height: 1024 },
  { width: 1440, height: 1000 },
]) {
  test(`Discord 1557581905220730932: hand picks remain exposed at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => localStorage.setItem("aegis:locale", "en"));
    await page.goto("/dev/effect-prompts?case=select-hand&controls=0");
    const rail = page.locator('.board-prompt[data-variant="selection"]');
    await expect(rail).toBeVisible();
    const candidates = page.locator(".game-hand-card--pickable[data-hand-instance-id]");
    const ids = await candidates.evaluateAll((cards) =>
      cards.map((card) => card.getAttribute("data-hand-instance-id")!),
    );
    expect(ids.length).toBeGreaterThanOrEqual(2);
    const first = page.locator(`[data-hand-instance-id="${ids[0]}"]`);
    const second = page.locator(`[data-hand-instance-id="${ids[1]}"]`);
    const witnessId = await page
      .locator(".game-hand-card--unpickable[data-hand-instance-id]")
      .first()
      .getAttribute("data-hand-instance-id");
    const witness = page.locator(`[data-hand-instance-id="${witnessId}"]`);
    await expect(witness).toHaveAttribute("aria-disabled", "true");
    await expectHandAccess(rail, first);
    await pointerPick(page, first);
    await expect(first).toHaveAttribute("aria-pressed", "true");
    await expectHandAccess(rail, first); // lifted selected face stays clear too
    await pointerPick(page, first);
    await expect(first).toHaveAttribute("aria-pressed", "false");
    await expectHandAccess(rail, second); // scroll a later exact instance into view
    await pointerPick(page, second);
    await expect(second).toHaveAttribute("aria-pressed", "true");
    await page.setViewportSize({ width: 390, height: 844 });
    await expectHandAccess(rail, second);
    await page.setViewportSize({ width: 844, height: 390 });
    await expectHandAccess(rail, second);
    await rail.getByRole("button", { name: "View board", exact: true }).click();
    await page.getByRole("button", { name: "Return to decision", exact: true }).click();
    await expect(second).toHaveAttribute("aria-pressed", "true");
    await expectHandAccess(rail, second);
    await second.press("Enter");
    await expect(second).toHaveAttribute("aria-pressed", "false");
    await second.press("Enter");
    await rail.getByRole("button", { name: "End Selection", exact: true }).click();
    await expect(rail).not.toBeVisible();
    await expect(witness).toBeVisible();
  });
}
