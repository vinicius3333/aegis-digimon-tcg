import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 906, height: 972 },
  { width: 390, height: 844 },
]) {
  test(`decision galleries stay centered and action rails remain compact at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    let expectedWidth: number | undefined;
    for (const specimen of [
      "decision-action-confirmation",
      "decision-optional-rail",
      "decision-choose-short",
      "decision-choose-long",
      "decision-select-cards",
      "decision-order-triggers",
      "decision-selection-rail",
      "decision-field-budget",
    ]) {
      await page.goto(`/dev/mobile?specimen=${specimen}&frame=1&locale=en`);
      const panel = page.locator("[data-prompt-surface]");
      await expect(panel).toBeVisible();
      const bounds = (await panel.boundingBox())!;
      const centered = viewport.width >= 768 && (await panel.getAttribute("data-prompt-surface")) === "center";
      if (centered) {
        expect(bounds.x + bounds.width / 2).toBeCloseTo(viewport.width / 2, 0);
        expect(bounds.y + bounds.height / 2).toBeCloseTo(viewport.height / 2, 0);
      } else expect(bounds.x).toBeCloseTo(viewport.width < 768 ? 0 : 8, 0);
      const handSelection = (await panel.getAttribute("data-variant")) === "selection";
      if (handSelection) {
        const handCards = page.locator(".game-hand-card[data-hand-instance-id]");
        const cardTops = await handCards.evaluateAll((cards) => cards.map((card) => card.getBoundingClientRect().top));
        const dock = (await page.locator(".game-hand-dock").boundingBox())!;
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(Math.min(dock.y, ...cardTops));
      } else if (viewport.width < 768) {
        const hand = page.locator(".game-hand--selecting");
        if (await hand.count()) {
          const dock = (await page.locator(".game-hand-dock").boundingBox())!;
          expect(bounds.y + bounds.height).toBeLessThanOrEqual(dock.y + 1);
        } else {
          expect(bounds.y + bounds.height).toBeCloseTo(viewport.height, 0);
        }
      } else if (!centered) {
        expect(bounds.y + bounds.height).toBeCloseTo(viewport.height - 8, 0);
      }
      expectedWidth ??= bounds.width;
      if (!centered) expect(bounds.width).toBeCloseTo(expectedWidth, 0);
      if (viewport.width < 768) {
        expect(bounds.height).toBeLessThanOrEqual(viewport.height * 0.78);
      } else if (centered) {
        expect(bounds.height).toBeLessThan(viewport.height);
      } else {
        expect(bounds.height).toBeLessThan(viewport.height);
        expect(await panel.evaluate((element) => element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1);
      }
      if (specimen === "decision-action-confirmation" && viewport.width >= 768) {
        expect(await panel.evaluate((element) => element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1);
      }
      const viewBoard = panel.getByRole("button", {
        name: specimen === "decision-field-budget" ? "Select on board" : "View board",
        exact: true,
      });
      await expect(viewBoard).toBeInViewport({ ratio: 1 });
      if (specimen === "decision-field-budget") {
        const count = (await panel.getByText("1 selected of 0–3", { exact: true }).boundingBox())!;
        const budget = (await panel.getByRole("status").boundingBox())!;
        expect(budget.y).toBeGreaterThanOrEqual(count.y + count.height);
      }
      await viewBoard.click();
      await expect(page.getByRole("button", { name: "Return to decision", exact: true })).toBeVisible();
    }
  });
}

test("short option dialogs fit their content without an empty bottom area", async ({ page }) => {
  await page.goto("/dev/mobile?specimen=decision-choose-short&frame=1&locale=en");
  const panel = page.getByRole("dialog");
  await expect(panel).toBeVisible();
  const bounds = (await panel.boundingBox())!;
  const lastAction = (await panel.getByRole("button", { name: "View board", exact: true }).boundingBox())!;
  const padding = await panel.evaluate((element) => parseFloat(getComputedStyle(element).paddingBottom));
  expect(bounds.y + bounds.height - lastAction.y - lastAction.height).toBeLessThanOrEqual(padding + 2);
});

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 950, height: 609 },
  { width: 390, height: 844 },
]) {
  test(`Millenniummon depth dialog fits without scrolling at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/dev/mobile?specimen=decision-millennium-depth&frame=1&locale=en");
    const panel = page.getByRole("dialog");
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("button", { name: "2 cards", exact: true })).toBeInViewport({ ratio: 1 });
    const viewBoard = panel.getByRole("button", { name: "View board", exact: true });
    await expect(viewBoard).toBeInViewport({ ratio: 1 });
    expect(await panel.evaluate((element) => element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1);
    const bounds = (await panel.boundingBox())!;
    const action = (await viewBoard.boundingBox())!;
    const padding = await panel.evaluate((element) => parseFloat(getComputedStyle(element).paddingBottom));
    expect(bounds.y + bounds.height - action.y - action.height).toBeLessThanOrEqual(padding + 2);
  });
}

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 1024, height: 768 },
]) {
  test(`Discord 1557059213266522233: card selection is centered and readable at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/dev/mobile?specimen=decision-trash-cards&frame=1&locale=en");
    const panel = page.getByRole("dialog");
    await expect(panel).toBeVisible();
    const bounds = (await panel.boundingBox())!;
    expect(bounds.x + bounds.width / 2).toBeCloseTo(viewport.width / 2, 0);
    expect(bounds.y + bounds.height / 2).toBeCloseTo(viewport.height / 2, 0);
    expect(bounds.width).toBeGreaterThan(600);
    const cards = panel.locator(".decision-overlay__grid").getByRole("button");
    await expect(cards).toHaveCount(8);
    await cards.first().click();
    await expect(cards.first()).toHaveAttribute("aria-pressed", "true");
    for (const card of await cards.all()) {
      await card.scrollIntoViewIfNeeded();
      const box = (await card.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(bounds.x);
      expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width);
      expect(box.y + box.height).toBeLessThanOrEqual(bounds.y + bounds.height);
    }
    await cards.first().scrollIntoViewIfNeeded();
    await test.info().attach("centered-card-gallery", { body: await page.screenshot(), contentType: "image/png" });
    expect(await panel.evaluate((element) => element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1);
    await panel.getByRole("button", { name: "View board", exact: true }).click();
    await expect(page.getByRole("button", { name: "Return to decision", exact: true })).toBeVisible();
  });
}

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 320, height: 740 },
]) {
  for (const kind of ["assembly", "digixros"]) {
    test(`Discord 1557059213266522233: ${kind} materials are clickable at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.addInitScript(() => localStorage.setItem("aegis:locale", "en"));
      await page.goto(`/dev/effect-prompts?case=${kind}&controls=0`);
      if (kind === "digixros") await page.getByRole("button", { name: "No, decline", exact: true }).click();
      const panel = page.getByRole("dialog");
      const material = panel.locator(".material-prompt__body").getByRole("button").first();
      await expect(material).toBeInViewport({ ratio: 1 });
      await material.click();
      await expect(material).toHaveAttribute("aria-pressed", "true");
      const bounds = (await panel.boundingBox())!;
      if (viewport.width >= 768) {
        expect(bounds.x + bounds.width / 2).toBeCloseTo(viewport.width / 2, 0);
        expect(bounds.y + bounds.height / 2).toBeCloseTo(viewport.height / 2, 0);
      }
      const header = (await panel.locator(".material-prompt__header").boundingBox())!;
      const body = (await panel.locator(".material-prompt__body").boundingBox())!;
      const footer = (await panel.locator(".material-prompt__footer").boundingBox())!;
      expect(body.y).toBeGreaterThanOrEqual(header.y + header.height);
      expect(footer.y).toBeGreaterThanOrEqual(body.y + body.height);
      await panel.getByRole("button", { name: "View board", exact: true }).click();
      await page.getByRole("button", { name: "Return to decision", exact: true }).click();
      await expect(material).toHaveAttribute("aria-pressed", "true");
    });
  }
}

for (const width of [1440, 390]) {
  test(`decision source artwork uses the same compact crop at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    for (const specimen of [
      "decision-millennium-depth",
      "decision-optional-rail",
      "decision-action-confirmation",
      "decision-select-cards",
    ]) {
      await page.goto(`/dev/mobile?specimen=${specimen}&frame=1&locale=en`);
      const art = page.locator(".mobile-prompt-art, .board-prompt__art-crop").first();
      await expect(art).toBeVisible();
      const bounds = (await art.boundingBox())!;
      expect(bounds.width).toBeCloseTo(64, 0);
      expect(bounds.height).toBeCloseTo(48, 0);
    }
  });
}

for (const width of [1440, 390]) {
  test(`updated modal gallery shows compact sources and field highlight at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(() => localStorage.setItem("aegis:locale", "en"));
    for (const scenario of [
      "millennium-depth",
      "millennium-delete",
      "trash-recovery",
      "revealed-search",
      "sukamon-bt11",
      "sukamon-bt3",
      "sukamon-ex13",
      "assembly",
      "digixros",
    ]) {
      await page.goto(`/dev/effect-prompts?case=${scenario}`);
      const panel = page.getByRole("dialog");
      await expect(panel).toBeVisible();
      const art = panel.locator(".mobile-prompt-art, .board-prompt__art-crop").first();
      await expect(art).toBeVisible();
      const crop = (await art.boundingBox())!;
      expect(crop.width).toBeCloseTo(64, 0);
      expect(crop.height).toBeCloseTo(48, 0);
      if (scenario.startsWith("millennium-")) {
        await expect(page.locator('[data-permanent-id="gallery-millennium"]')).toHaveClass(
          /game-permanent--effect-linked/,
        );
        const bounds = (await panel.boundingBox())!;
        expect(bounds.height).toBeLessThan(width < 768 ? 780 : 500);
      }
      if (["trash-recovery", "revealed-search", "sukamon-bt11", "sukamon-bt3", "sukamon-ex13"].includes(scenario)) {
        await expect(panel.locator('[data-instance-id="gallery-search-0"]')).toBeEnabled();
        await expect(panel.locator('[data-instance-id="gallery-search-2"]')).toBeDisabled();
      }
    }
  });
}
