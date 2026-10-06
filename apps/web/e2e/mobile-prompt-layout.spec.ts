import { expect, test, type Page } from "@playwright/test";

const specimens = [
  "optional-field",
  "optional-hidden",
  "choose-yes-no",
  "choose-clauses",
  "choose-effects",
  "choose-revealed",
  "select-hand",
  "choose-targets-hand",
  "select-field",
  "select-mixed",
  "select-player",
  "select-dp-budget",
  "select-cost-budget",
  "select-empty",
  "order-cards",
  "order-triggers",
  "order-same-card",
  "resolution-plan",
  "partition",
  "confirm-action",
  "dual-play",
  "evo-cost",
  "effect-evo-cost",
  "assembly",
  "digixros-expander",
  "app-fusion",
  "app-fusion-empty",
  "block",
  "collision",
  "collision-empty",
  "alliance",
  "counter-sources",
  "counter-blast",
  "counter-field",
  "counter-empty",
  "barrier",
  "evade",
  "source-host",
];

class MobilePromptPreview {
  constructor(readonly page: Page) {}

  async open(specimen: string, locale = "pt-BR") {
    await this.page.addInitScript((language) => localStorage.setItem("aegis:locale", language), locale);
    await this.page.goto(`/dev/effect-prompts?case=${specimen}&controls=0`);
    const panel = this.page.locator("[data-prompt-surface]");
    await expect(panel).toBeVisible();
    return panel;
  }
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 720, height: 972 },
  { width: 1440, height: 1000 },
]) {
  test(`action confirmation fits its content at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const panel = await new MobilePromptPreview(page).open("confirm-action", "en");
    const header = (await panel.locator(".action-confirmation__header").boundingBox())!;
    const actions = (await panel.locator(".game-actions-row").boundingBox())!;
    const board = (await panel.getByRole("button", { name: "View board", exact: true }).boundingBox())!;
    expect(actions.y - (header.y + header.height)).toBeLessThanOrEqual(16);
    expect(board.y - (actions.y + actions.height)).toBeLessThanOrEqual(16);
    expect(await panel.evaluate((element) => element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1);
  });
}

for (const viewport of [
  { width: 320, height: 740 },
  { width: 390, height: 844 },
  { width: 720, height: 972 },
  { width: 844, height: 390 },
]) {
  test(`mobile prompt types keep their actions and hand accessible at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const preview = new MobilePromptPreview(page);
    for (const specimen of specimens) {
      await test.step(specimen, async () => {
        const panel = await preview.open(specimen);
        const bounds = (await panel.boundingBox())!;
        expect(bounds.x).toBeCloseTo(0, 0);
        expect(bounds.width).toBeCloseTo(viewport.width, 0);
        expect(bounds.y).toBeGreaterThanOrEqual(0);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height + 1);
        const hand = page.locator(".game-hand-dock");
        if (await hand.locator(".game-hand--selecting").count()) {
          const handBounds = (await hand.boundingBox())!;
          expect(bounds.y + bounds.height).toBeLessThanOrEqual(handBounds.y + 1);
        }
        const viewBoard = panel.getByRole("button", { name: /^Ver mesa$/i });
        await expect(viewBoard).toBeInViewport({ ratio: 1 });
        expect(await panel.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
        await viewBoard.click();
        await expect(panel).toBeHidden();
        const back = page.getByRole("button", { name: "Voltar à decisão", exact: true });
        await expect(back).toBeInViewport({ ratio: 1 });
        await back.click();
        await expect(panel).toBeVisible();
      });
    }
  });
}

test("long mobile choices keep their header above their actions", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dev/mobile?specimen=decision-choose-long&frame=1&locale=pt-BR");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const header = (await dialog.locator(".decision-overlay__header").boundingBox())!;
  const choice = (await dialog.getByRole("button", { name: /Descarte a carta do topo/i }).boundingBox())!;
  expect(choice.y).toBeGreaterThanOrEqual(header.y + header.height);
  expect(await dialog.evaluate((element) => element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1);
});

test("viewing the board preserves the selected pending effect", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dev/mobile?specimen=decision-order-triggers&frame=1&locale=en");
  const panel = page.getByRole("dialog");
  await expect(panel).toBeVisible();
  const effect = panel.getByRole("button", { name: /MetalGreymon,/ });
  await effect.click();
  await expect(effect).toHaveAttribute("aria-pressed", "true");
  await panel.getByRole("button", { name: "View board", exact: true }).click();
  await page.getByRole("button", { name: "Return to decision", exact: true }).click();
  await expect(effect).toHaveAttribute("aria-pressed", "true");
  await expect(panel.getByRole("button", { name: /resolve next effect/i })).toBeEnabled();
});

test("hand selection keeps every card undimmed and preserves picks when viewing the board", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const panel = await new MobilePromptPreview(page).open("select-cost-budget");
  const cards = page.locator(".game-hand-card");
  for (const card of await cards.all()) {
    await expect(card).toBeInViewport({ ratio: 1 });
    await expect(card).toHaveCSS("opacity", "1");
    expect(
      await card.evaluate((element) =>
        [...element.children].every((child) => getComputedStyle(child).filter === "none"),
      ),
    ).toBe(true);
  }
  await expect(page.locator('.board-prompt-scrim[data-variant="selection"]')).toBeHidden();
  const eligible = page.locator('[data-hand-instance-id="hand-0"]');
  await eligible.click();
  await expect(eligible).toHaveAttribute("aria-pressed", "true");
  await expect(cards.filter({ has: page.getByRole("img", { name: /Chronomon/i }) })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await panel.getByRole("button", { name: "Ver mesa", exact: true }).click();
  await page.getByRole("button", { name: "Voltar à decisão", exact: true }).click();
  await expect(eligible).toHaveAttribute("aria-pressed", "true");
  await expect(panel.getByRole("button", { name: "Confirmar", exact: true })).toBeEnabled();
});

for (const keyword of ["evade", "barrier"]) {
  test(`${keyword} uses one title, English rules, compact answers and board preview`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const panel = await new MobilePromptPreview(page).open(keyword);
    await expect(panel.locator(".board-prompt__eyebrow, .board-prompt__art")).toHaveCount(0);
    await expect(panel.locator(".board-prompt__clause")).toHaveAttribute("lang", "en");
    await expect(panel.locator(".board-prompt__clause")).toContainText("When this Digimon would be deleted");
    await expect(panel.getByRole("button", { name: "Usar", exact: true })).toBeInViewport({ ratio: 1 });
    await expect(panel.getByRole("button", { name: "Não usar", exact: true })).toBeInViewport({ ratio: 1 });
    const bounds = (await panel.boundingBox())!;
    expect(bounds.y + bounds.height).toBeCloseTo(844, 0);
    expect(bounds.height).toBeLessThan(320);
    await panel.getByRole("button", { name: "Ver mesa", exact: true }).click();
    await expect(panel).toBeHidden();
    await page.getByRole("button", { name: "Voltar à decisão", exact: true }).click();
    await panel.getByRole("button", { name: "Não usar", exact: true }).click();
    await expect(panel).toBeHidden();
  });
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 844, height: 390 },
]) {
  test(`DigiXros materials retain picks and accessible actions at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const panel = await new MobilePromptPreview(page).open("digixros");
    await panel.getByRole("button", { name: "Não, recusar", exact: true }).click();
    const materials = page.locator(".material-prompt");
    const candidate = materials.getByRole("button", { name: "Greymon (batalha)", exact: true });
    await candidate.click();
    await expect(candidate).toHaveAttribute("aria-pressed", "true");
    const body = materials.locator(".material-prompt__body");
    const bodyBounds = (await body.boundingBox())!;
    for (const grid of await body.locator(".material-prompt__grid").all()) {
      const gridBounds = (await grid.boundingBox())!;
      expect(gridBounds.x).toBeGreaterThanOrEqual(bodyBounds.x);
      expect(gridBounds.x + gridBounds.width).toBeLessThanOrEqual(bodyBounds.x + bodyBounds.width + 1);
    }
    const board = materials.getByRole("button", { name: "Ver mesa", exact: true });
    await expect(board).toBeInViewport({ ratio: 1 });
    await board.click();
    await page.getByRole("button", { name: "Voltar à decisão", exact: true }).click();
    await expect(candidate).toHaveAttribute("aria-pressed", "true");
    await expect(materials.getByRole("button", { name: /DigiXros \(1 carta/i })).toBeInViewport({ ratio: 1 });
  });

  test(`mulligan and inspection fit the mobile viewport at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => localStorage.setItem("aegis:locale", "pt-BR"));
    for (const specimen of ["mulligan-first", "mulligan-second", "inherited-inspector"]) {
      await page.goto(`/dev/effect-prompts?case=${specimen}&controls=0`);
      const dialog = specimen.startsWith("mulligan") ? page.locator(".mulligan-sheet") : page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      const bounds = (await dialog.boundingBox())!;
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height + 1);
      const action = dialog.getByRole("button", {
        name: specimen.startsWith("mulligan") ? "Ficar com a mão" : "Fechar",
        exact: specimen === "inherited-inspector",
      });
      await expect(action).toBeInViewport({ ratio: 1 });
    }
  });
}

test("revealed cards use a large centered desktop dialog with fully visible choices", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const dialog = await new MobilePromptPreview(page).open("choose-revealed");
  await expect(dialog).toHaveAttribute("data-prompt-surface", "center");
  const bounds = (await dialog.boundingBox())!;
  expect(bounds.width).toBeGreaterThan(800);
  expect(bounds.x + bounds.width / 2).toBeCloseTo(720, 0);
  expect(bounds.y + bounds.height / 2).toBeCloseTo(500, 0);
  expect(await dialog.evaluate((element) => element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1);
  for (const card of await dialog.locator(".decision-overlay__choice-cards img").all()) {
    await expect(card).toBeInViewport({ ratio: 1 });
  }
  await expect(dialog.getByRole("button", { name: "Topo do deck", exact: true })).toBeInViewport({ ratio: 1 });
  await expect(dialog.getByRole("button", { name: "Fundo do deck", exact: true })).toBeInViewport({ ratio: 1 });
  await dialog.getByRole("button", { name: "Topo do deck", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Resposta enviada" })).toContainText('"optionIndex": 0');
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 1000 },
]) {
  test(`digivolution sources select their host on the field at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const preview = new MobilePromptPreview(page);
    const panel = await preview.open("source-host");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(panel).toContainText("Toque no Digimon");
    await expect(panel).toContainText("You may play or use 1");
    await expect(panel.getByRole("button", { name: /Canoweissmon/ })).toHaveCount(0);
    await panel.getByRole("button", { name: "Ver mesa", exact: true }).click();
    await page.locator('[data-permanent-id="gallery-canoweissmon"]').click();
    const sources = page.getByRole("dialog");
    await expect(sources).toBeVisible();
    await expect(sources.getByRole("button", { name: /^BetelGammamon/ })).toBeVisible();
    await expect(sources.getByRole("button", { name: /^Siriusmon/ })).toHaveCount(0);
    await sources.getByRole("button", { name: /Escolher outro Digimon/i }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: "Ver mesa", exact: true }).click();
    await page.locator('[data-permanent-id="gallery-proximamon"]').click();
    await sources.getByRole("button", { name: /^Siriusmon/ }).click();
    await sources.getByRole("button", { name: "Confirmar", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("gallery-proximamon-under-0");
  });
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 1000 },
]) {
  test(`Alliance and Block choose physical cards at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const preview = new MobilePromptPreview(page);
    const alliance = await preview.open("alliance");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await alliance.getByRole("button", { name: "Ver mesa", exact: true }).click();
    const ally = page
      .getByRole("group", { name: "Seus Digimon", exact: true })
      .getByRole("button", { name: "Hyokomon", exact: true });
    await ally.click();
    const confirmation = page.getByRole("dialog");
    await expect(confirmation.getByRole("button", { name: /Usar Alliance/i })).toBeVisible();
    await expect(page.getByRole("status")).toHaveCount(0);
    await confirmation.getByRole("button", { name: /Usar Alliance/i }).click();
    await expect(page.getByRole("status")).toContainText("respondAlliance");
    await expect(page.getByRole("status")).toContainText("allyPermanentId");
    const block = await preview.open("block");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await block.getByRole("button", { name: "Ver mesa", exact: true }).click();
    await page
      .getByRole("group", { name: "Seus Digimon", exact: true })
      .getByRole("button", { name: "Hyokomon", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("declareBlock");
  });
}

test("Alliance skips its prompt when there are no eligible allies", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("aegis:locale", "pt-BR"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dev/effect-prompts?case=alliance-empty&controls=0");
  await expect(page.getByRole("status")).toContainText("respondAlliance");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("[data-prompt-surface]")).toHaveCount(0);
});

for (const viewport of [
  { width: 320, height: 740 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
]) {
  test(`match utility dialogs stay accessible at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => localStorage.setItem("aegis:locale", "pt-BR"));
    for (const specimen of ["waiting", "waiting-error", "arena-settings", "feedback", "surrender"]) {
      await test.step(specimen, async () => {
        await page.goto(`/dev/effect-prompts?case=${specimen}&controls=0`);
        const panel = page.getByRole("dialog");
        await expect(panel).toBeVisible();
        const bounds = (await panel.boundingBox())!;
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.y).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width + 1);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height + 1);
        expect(await panel.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
        const close = panel.getByRole("button", { name: /^(Fechar|Cancelar)$/i }).first();
        await close.scrollIntoViewIfNeeded();
        await expect(close).toBeInViewport({ ratio: 1 });
        await close.click();
        await expect(panel).toBeHidden();
      });
    }
  });
}

for (const viewport of [
  { width: 320, height: 740 },
  { width: 390, height: 844 },
  { width: 1440, height: 1000 },
]) {
  test(`security target uses a compact sleeve choice at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const preview = new MobilePromptPreview(page);
    const panel = await preview.open("select-player");
    expect((await panel.boundingBox())!.height).toBeLessThan(350);
    expect(await panel.evaluate((element) => element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1);
    const target = panel.getByRole("button", { name: /^Segurança do oponente/ });
    await expect(target.locator('img[src="/sleeves/digimon-standard.webp"]')).toBeVisible();
    await target.click();
    await expect(target).toHaveAttribute("aria-pressed", "true");
    await panel.getByRole("button", { name: "Atacar", exact: true }).click();
    await expect(page.getByRole("status")).toContainText('"player"');
  });
}

test("ordering cards and effects opens a large centered desktop dialog", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const preview = new MobilePromptPreview(page);
  for (const specimen of ["order-cards", "order-triggers", "order-same-card", "resolution-plan"]) {
    const panel = await preview.open(specimen);
    await expect(panel).toHaveAttribute("data-prompt-surface", "center");
    const bounds = (await panel.boundingBox())!;
    expect(bounds.width).toBeGreaterThan(800);
    expect(bounds.x + bounds.width / 2).toBeCloseTo(720, 0);
    expect(bounds.y + bounds.height / 2).toBeCloseTo(500, 0);
    await expect(panel.getByRole("button", { name: "Ver mesa", exact: true })).toBeInViewport({ ratio: 1 });
    if (specimen === "order-cards") {
      expect(await panel.evaluate((element) => element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1);
      for (const row of await panel.locator(".decision-overlay__order-row").all())
        await expect(row).toBeInViewport({ ratio: 1 });
    } else {
      for (const option of await panel.locator(".trigger-chooser__option").all())
        await expect(option).toBeInViewport({ ratio: 1 });
    }
  }
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 1000 },
]) {
  test(`combat prompts keep English rules and short actions at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const preview = new MobilePromptPreview(page);
    for (const specimen of ["alliance", "block", "collision"]) {
      const panel = await preview.open(specimen);
      const rules = panel.locator('[lang="en"]');
      await expect(rules).toContainText(
        specimen === "alliance"
          ? "When this Digimon attacks"
          : specimen === "collision"
            ? "must block if possible"
            : "When an opponent's Digimon attacks",
      );
      await expect(panel.getByRole("button", { name: "Ver mesa", exact: true })).toBeInViewport({ ratio: 1 });
      if (specimen === "block")
        await expect(panel.getByRole("button", { name: "Não bloquear", exact: true })).toBeInViewport({ ratio: 1 });
    }
    const empty = await preview.open("collision-empty");
    await expect(empty).toContainText("Sem bloqueadores.");
    await expect(empty.getByRole("button", { name: "Não bloquear", exact: true })).toBeVisible();
    expect((await empty.boundingBox())!.height).toBeLessThan(300);
  });
}
