import { expect, test } from "@playwright/test";

for (const width of [320, 390, 768, 1024, 1440]) {
  test(`deck tile shows complete format and banned-pair warnings at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(() => localStorage.setItem("aegis:locale", "pt-BR"));
    await page.goto("/e2e/lobby-formats.html");
    await page.getByText("Configurações avançadas", { exact: true }).click();
    await page.getByRole("combobox", { name: "Cartas até", exact: true }).selectOption("all");
    await page.getByRole("combobox", { name: "Regras", exact: true }).selectOption("pauper");
    const card = page
      .locator(".deck-picker__own")
      .getByRole("article")
      .filter({
        has: page.getByRole("heading", { name: "Sakuyamon", exact: true }),
      });
    await card.scrollIntoViewIfNeeded();
    await expect(card.getByRole("button", { name: "Sakuyamon", exact: true })).toBeDisabled();
    const pairWarning = card.locator(".deck-list-card__pair-violation");
    await expect(pairWarning).toContainText("Chaosmon: Valdur Arm");
    await expect(pairWarning).toContainText("Sakuyamon (X Antibody)");
    for (const warning of await card.locator(".deck-list-card__violation, .deck-list-card__pair-violation").all()) {
      const dimensions = await warning.evaluate((element) => ({
        width: element.clientWidth,
        scrollWidth: element.scrollWidth,
        height: element.clientHeight,
        scrollHeight: element.scrollHeight,
      }));
      expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width + 1);
      expect(dimensions.scrollHeight).toBeLessThanOrEqual(dimensions.height + 1);
    }
    const actions = card.locator(".deck-list-card__actions");
    const pairBounds = await pairWarning.boundingBox();
    const actionBounds = await actions.boundingBox();
    expect(actionBounds!.y).toBeGreaterThanOrEqual(pairBounds!.y + pairBounds!.height);
    const edit = card.getByRole("button", { name: "Editar", exact: true });
    await edit.scrollIntoViewIfNeeded();
    const editBounds = await edit.boundingBox();
    const cardBounds = await card.boundingBox();
    expect(editBounds!.x).toBeGreaterThanOrEqual(cardBounds!.x);
    expect(editBounds!.x + editBounds!.width).toBeLessThanOrEqual(cardBounds!.x + cardBounds!.width);
    await expect(edit).toBeEnabled();
    const activeCard = page
      .locator(".deck-picker__own")
      .getByRole("article")
      .filter({
        has: page.getByRole("heading", { name: "Eosmon", exact: true }),
      });
    const formatBadge = activeCard.locator(".deck-list-card__format");
    const headingBounds = await activeCard.getByRole("heading", { name: "Eosmon", exact: true }).boundingBox();
    const badgeBounds = await formatBadge.boundingBox();
    expect(badgeBounds!.y).toBeGreaterThanOrEqual(headingBounds!.y + headingBounds!.height);
    const coverBounds = await activeCard.locator(".deck-list-card__cover").boundingBox();
    const activeBounds = await activeCard.locator(".deck-list-card__active").boundingBox();
    expect(activeBounds!.y + activeBounds!.height).toBeLessThanOrEqual(coverBounds!.y + coverBounds!.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await card.screenshot({ path: test.info().outputPath(`deck-picker-warnings-${width}.png`) });
  });
}
