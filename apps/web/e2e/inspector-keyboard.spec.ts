import { waitForPackOpeningScene } from "./waitForPackOpeningScene";
import { pausePackOpeningAnimations } from "./pausePackOpeningAnimations";
import { togglePackOpeningCheckbox } from "./togglePackOpeningCheckbox";
import { activatePackOpeningButton } from "./activatePackOpeningButton";
import { test, expect } from "@playwright/test";

const evidence = process.env.AEGIS_SEALED_EVIDENCE_DIR ?? "test-results/sealed/inspector";
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: Date.now() - 1000 });
});
for (const width of [390, 1440]) {
  for (const dark of [false, true]) {
    for (const mode of ["builder", "opening", "ordinary", "dialog"]) {
      test(`${mode} contains actual keyboard focus at ${width}px ${dark ? "dark" : "light"}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.addInitScript((value) => localStorage.setItem("aegis:darkMode", String(value)), dark);
        await page.goto(`/e2e/inspector-keyboard.html?mode=${mode}`, { waitUntil: "domcontentloaded" });
        let opener = page.getByRole("button", { name: "Open surface", exact: true });
        if (mode === "builder" || mode === "opening") {
          await pausePackOpeningAnimations({ page });
          await opener.click();
          await waitForPackOpeningScene({ page });
          await expect(page.locator(".pack-opening canvas")).toBeVisible();
          await togglePackOpeningCheckbox({ page, name: "Skip animations" });
          await activatePackOpeningButton({ page, name: mode === "builder" ? "Open all packs (6)" : "Open pack" });
          if (mode === "builder") {
            await activatePackOpeningButton({ page, name: "Back to deck building" });
            await page.clock.resume();
            opener = page.locator('[data-pool-card="BT4-104"]').getByRole("button", { name: "Card info", exact: true });
          } else {
            opener = page.getByRole("button", { name: "Card details", exact: true });
          }
        }
        await opener.focus();
        await page.keyboard.press("Enter");
        const surface = page.getByRole("dialog", {
          name: mode === "dialog" ? "Ordinary dialog" : "Card detail",
          exact: true,
        });
        await expect(surface).toBeVisible();
        const controls = surface.locator('button:visible:not(:disabled), [href]:visible, [tabindex="0"]:visible');
        const count = await controls.count();
        expect(count).toBeGreaterThan(0);
        await controls.first().focus();
        await page.keyboard.press("Shift+Tab");
        await expect(controls.last()).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(controls.first()).toBeFocused();
        for (const key of ["Tab", "Shift+Tab"]) {
          for (let step = 0; step < count + 3; step++) {
            await page.keyboard.press(key);
            expect(await surface.evaluate((element) => element.contains(document.activeElement))).toBe(true);
          }
        }
        if (mode !== "dialog") {
          await page
            .getByRole("button", { name: "Background action 0", exact: true })
            .evaluate((element: HTMLElement) => element.focus());
          expect(await surface.evaluate((element) => element.contains(document.activeElement))).toBe(true);
          if (mode !== "ordinary") {
            await expect(surface.locator(".card-detail-copy-limit")).toHaveText(
              mode === "opening" ? "1 / 1 available" : "5 / 5 available",
            );
            await expect(surface.locator(".card-detail-restriction")).toHaveCount(0);
          } else {
            await expect(surface.locator(".card-detail-restriction")).toHaveText("LIMIT 1");
            await expect(surface.locator(".card-detail-copy-limit")).toContainText("1");
          }
        }
        if (mode === "ordinary") {
          const artOpener = surface.getByRole("button", { name: "Inspector action", exact: true });
          await artOpener.focus();
          await page.keyboard.press("Enter");
          const picker = page.getByRole("dialog", { name: "Choose artwork", exact: true });
          await expect(picker).toBeVisible();
          await picker.getByRole("button", { name: "Close", exact: true }).focus();
          await page.keyboard.press("Shift+Tab");
          await expect(picker.getByRole("button", { name: "Done", exact: true })).toBeFocused();
          await page.keyboard.press("Tab");
          await expect(picker.getByRole("button", { name: "Close", exact: true })).toBeFocused();
          await page.keyboard.press("Escape");
          await expect(picker).toHaveCount(0);
          await expect(surface).toBeVisible();
          await expect(artOpener).toBeFocused();
        }
        await page.screenshot({ path: `${evidence}/${mode}-${width}-${dark ? "dark" : "light"}.png`, fullPage: true });
        await page.keyboard.press("Escape");
        await expect(surface).toHaveCount(0);
        await expect(opener).toBeFocused();
        if (mode === "opening") {
          await expect(page.locator(".pack-opening-page")).toBeVisible();
          await page.getByRole("button", { name: "Back to deck building", exact: true }).click();
          await expect(page.locator(".pack-opening-page")).toHaveCount(0);
          await page.clock.resume();
          await expect(page.getByRole("button", { name: "Open surface", exact: true })).toBeFocused();
        }
        await page.getByRole("button", { name: "Background action 0", exact: true }).focus();
        await page.keyboard.press("Enter");
        await expect(page.getByRole("button", { name: "Background action 1", exact: true })).toBeVisible();
      });
    }
  }
}
