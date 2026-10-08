import { expect, test, type Page } from "@playwright/test";

class FormatBuilderPage {
  constructor(readonly page: Page) {}
  format() {
    return this.page.getByRole("combobox", { name: "Rules", exact: true });
  }
  pool() {
    return this.page.getByRole("combobox", { name: "Cards through", exact: true });
  }
  async search(card: string) {
    const filters = this.page.getByRole("button", { name: "Filters", exact: true });
    if (await filters.isVisible()) {
      await filters.click();
      const dialog = this.page.getByRole("dialog", { name: "Filters" });
      await dialog.getByRole("textbox", { name: "Search name, number or text…" }).fill(card);
      await dialog.getByRole("button", { name: /^Show \d+ cards$/ }).click();
    } else {
      await this.page.getByRole("textbox", { name: "Search name, number or text…" }).fill(card);
    }
  }
}

for (const width of [320, 768, 1024, 1440]) {
  test(`BT13 card pool and historical caps remain usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/e2e/deck-builder.html");
    const builder = new FormatBuilderPage(page);
    await builder.pool().selectOption("BT13");
    await expect(page.getByText(/Card pool through BT13\. Banlist: 2023-07-21/)).toBeVisible();
    await builder.search("BT13-012");
    if (width === 1440) {
      await page.getByRole("button", { name: "Card info", exact: true }).click();
      const detail = page.getByRole("dialog");
      await expect(detail.getByText("max 4 / deck", { exact: true })).toBeVisible();
      const alternative = detail.getByRole("button", { name: /^Alternate \d/ }).first();
      if (await alternative.count()) {
        await alternative.click();
        await expect(detail.getByText("max 4 / deck", { exact: true })).toBeVisible();
      }
      await detail.getByRole("button", { name: "Close", exact: true }).click();
    }
    await page.getByRole("button", { name: "Add", exact: true }).click();
    const poolStepper = page.getByRole("button", { name: "Add", exact: true });
    for (let i = 0; i < 3; i++) await poolStepper.click();
    await expect(poolStepper).toBeDisabled();
    await builder.pool().selectOption("all");
    const details = page.getByRole("button", { name: /Tap to see more about the deck/ });
    if (await details.isVisible()) await details.click();
    await expect(page.getByText(/GeoGreymon.*4.*1/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: test.info().outputPath(`bt13-${width}.png`), fullPage: true });
  });
}

test("Pauper hides rare cards and preserves existing cards with a format violation", async ({ page }) => {
  await page.goto("/e2e/deck-builder.html");
  const builder = new FormatBuilderPage(page);
  await builder.search("BT1-025");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await builder.format().selectOption("pauper");
  await expect(page.getByText(/1 card\(s\) in this deck are outside/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Add", exact: true })).toHaveCount(0);
  await builder.format().selectOption("standard");
  await expect(page.getByRole("button", { name: "Remove", exact: true })).toBeVisible();
});
