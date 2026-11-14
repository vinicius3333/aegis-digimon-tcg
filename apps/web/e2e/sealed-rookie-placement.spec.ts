const evidence = process.env.AEGIS_SEALED_EVIDENCE_DIR ?? "test-results/sealed/rookie";
import { test, expect } from "./scenario-page";
import fixture from "@api-fixtures/sealed-rookie-placement.fixture";

for (const width of [390, 1440]) {
  for (const dark of [false, true]) {
    test(`places a level three without On Play at ${width}px in ${dark ? "dark" : "light"}`, async ({
      page,
      scenario,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript((value) => {
        localStorage.setItem("aegis:darkMode", String(value));
      }, dark);
      await scenario.openFixture(fixture, "normal", "none");
      const action = page.getByRole("button", { name: /Place in breeding.*Gabumon/i });
      await expect(action).toBeVisible();
      await expect.poll(() => action.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      await expect(page.locator(".sealed-breeding-actions")).toHaveCSS("z-index", "21");
      await expect(page.getByText("Choose one breeding action, or end breeding.", { exact: true })).toBeVisible();
      await page.screenshot({
        path: `${evidence}/rookie-breeding-controls-${width}-${dark ? "dark" : "light"}.png`,
        fullPage: true,
      });
      await action.click();
      await expect
        .poll(
          async () => (await page.evaluate(() => window.browserTestSnapshot())).players[0]?.breeding?.topCard?.cardId,
        )
        .toBe("BT1-029");
      await expect(action).toHaveCount(0);
      await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
      await page.screenshot({
        path: `${evidence}/rookie-breeding-${width}-${dark ? "dark" : "light"}.png`,
        fullPage: true,
      });
      const snapshot = await page.evaluate(() => window.browserTestSnapshot());
      expect(snapshot.memory).toBe(3);
    });
  }
}
