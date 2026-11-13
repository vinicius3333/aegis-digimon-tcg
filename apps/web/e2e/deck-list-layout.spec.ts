import { expect, test } from "@playwright/test";

for (const width of [390, 700, 820, 1024, 1440]) {
  for (const theme of ["light", "dark"] as const) {
    test(`deck row keeps names readable beside its actions at ${width}px in ${theme} mode`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(() => localStorage.setItem("aegis:locale", "en"));
      await page.goto("/e2e/deck-list.html");
      await page.evaluate((dark) => document.documentElement.classList.toggle("dark", dark), theme === "dark");
      const rows = page.locator(".deck-list-row");
      await expect(rows).toHaveCount(3);
      for (const row of await rows.all()) {
        const title = row.getByRole("heading", { level: 3 });
        const titleOverflow = await title.evaluate((element) => element.scrollWidth - element.clientWidth);
        expect(titleOverflow).toBeLessThanOrEqual(0);
        const identity = await row.locator(".deck-list-row__identity").boundingBox();
        const actions = await row.locator(".deck-list-row__actions").boundingBox();
        for (const button of await row.locator(".deck-list-row__actions > *").all()) {
          const bounds = (await button.boundingBox())!;
          expect(bounds.x).toBeGreaterThanOrEqual(actions!.x - 1);
          expect(bounds.x + bounds.width).toBeLessThanOrEqual(actions!.x + actions!.width + 1);
          const besideIdentity = bounds.y < identity!.y + identity!.height && bounds.y + bounds.height > identity!.y;
          if (besideIdentity) expect(bounds.x).toBeGreaterThanOrEqual(identity!.x + identity!.width);
        }
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await page.screenshot({ path: test.info().outputPath(`deck-list-${width}-${theme}.png`), fullPage: true });
    });
  }
}
