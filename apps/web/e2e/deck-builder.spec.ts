import { expect, test } from "@playwright/test";
const labels = {
  en: {
    "mobile.filters": "Filters",
    "library.traitAttribute": "Trait / attribute",
    "library.searchPlaceholder": "Search cards…",
    "common.add": "Add",
    "common.remove": "Remove",
  },
  "pt-BR": {
    "mobile.filters": "Filtros",
    "library.traitAttribute": "Traço / atributo",
    "library.searchPlaceholder": "Buscar cartas…",
    "common.add": "Adicionar",
    "common.remove": "Remover",
  },
};

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
