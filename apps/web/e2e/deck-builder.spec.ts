import { expect, test } from "@playwright/test";
const labels = {
  en: {
    "mobile.filters": "Filters",
    "library.traitAttribute": "Trait / attribute",
    "library.searchPlaceholder": "Search name, number or text…",
    "common.add": "Add",
    "common.remove": "Remove",
  },
  "pt-BR": {
    "mobile.filters": "Filtros",
    "library.traitAttribute": "Traço / atributo",
    "library.searchPlaceholder": "Buscar nome, número ou texto…",
    "common.add": "Adicionar",
    "common.remove": "Remover",
  },
};

const layoutViewports = [
  { name: "phone", width: 390, height: 844 },
  { name: "foldable inner screen", width: 673, height: 841 },
  { name: "phone landscape", width: 844, height: 390 },
  { name: "tablet landscape", width: 1024, height: 768 },
] as const;

for (const viewport of layoutViewports) {
  test(`deck builder fits and keeps the deck reachable on a ${viewport.name}`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("aegis:deckBuilder", JSON.stringify({ deckShare: 0.75 })));
    await page.setViewportSize(viewport);
    await page.goto("/e2e/deck-builder.html");
    await page.getByRole("button", { name: "Add", exact: true }).first().click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    const pool = await page.locator(".deck-card-pool").boundingBox();
    expect(pool!.x + pool!.width).toBeLessThanOrEqual(viewport.width);

    const deck = page.getByRole("complementary", { name: "Deck information" });
    const sheetTrigger = page.getByRole("button", { name: /Tap to see more about the deck/ });
    if (await sheetTrigger.isVisible()) await sheetTrigger.click();
    const deckList = deck.locator(".deck-preview");
    await deckList.scrollIntoViewIfNeeded();
    await expect(deckList).toBeInViewport();
    const deckBox = await deck.boundingBox();
    expect(deckBox!.x + deckBox!.width).toBeLessThanOrEqual(viewport.width);
  });
}

for (const locale of ["en", "pt-BR"] as const) {
  test(`1555813766040391700: red Hybrid is searchable in the mobile deck builder (${locale})`, async ({ page }) => {
    const t = (key: keyof typeof labels.en | "mobile.applyFilters", params?: { count: number }) =>
      key === "mobile.applyFilters"
        ? locale === "en"
          ? `Show ${params!.count} cards`
          : `Mostrar ${params!.count} cartas`
        : labels[locale][key];
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript((value) => localStorage.setItem("aegis:locale", value), locale);
    await page.goto("/e2e/deck-builder.html");
    await page.getByRole("button", { name: t("mobile.filters"), exact: true }).click();
    const sheet = page.getByRole("dialog", { name: t("mobile.filters") });
    await sheet.getByRole("button", { name: "Red", exact: true }).click();
    const trait = sheet.getByRole("textbox", { name: t("library.traitAttribute") });
    const positiveResults = sheet.getByRole("button", {
      name: locale === "en" ? /^Show [1-9][0-9]* cards$/ : /^Mostrar [1-9][0-9]* cartas$/,
    });
    // Variable is the working control reported in the thread, not a Hybrid alias.
    await trait.fill("Variable");
    await expect(positiveResults).toBeVisible();
    await trait.fill("Hybrid");
    await expect(positiveResults).toBeVisible();
    // Pin one printed red Hybrid to verify the result and that it can be added.
    await sheet.getByRole("textbox", { name: t("library.searchPlaceholder") }).fill("BT7-011");
    await expect(
      sheet.getByRole("button", { name: t("mobile.applyFilters", { count: 1 }), exact: true }),
    ).toBeVisible();
    await trait.fill("  hYbRiD  ");
    await sheet.getByRole("button", { name: t("mobile.applyFilters", { count: 1 }), exact: true }).click();
    await page.getByRole("button", { name: t("common.add"), exact: true }).click();
    await expect(page.getByRole("button", { name: t("common.remove"), exact: true })).toBeVisible();
  });
}
