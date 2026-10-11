import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { PracticePage } from "./practice-page";

test("live preview starts a guest match with the evolved policy", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/play");
  await new PracticePage(page).startMatch();
  await expect(page.locator('.game-player-line[data-side="opponent"]')).toContainText("Strategy Bot");
  expect(errors).toEqual([]);
});

for (const width of [390, 1440]) {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`experimental guides reach practice at ${width}px in ${colorScheme}`, async ({ page, request }, info) => {
      const catalog: { slug: string; title: string; url: string }[] = JSON.parse(
        readFileSync(new URL("../src/guides/catalog.json", import.meta.url), "utf8"),
      );
      expect(catalog.map((guide) => guide.slug).sort()).toEqual(["fundamentals", "glowing-dawn", "toho-braves"]);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await page.emulateMedia({ colorScheme });
      const response = await request.get("/strategy-guides/evidence.json");
      expect(response.status()).toBe(200);
      const evidence = await response.json();
      expect(evidence.experimental).toBe(true);
      expect(evidence.simulations).toBe(8);
      expect(Object.keys(evidence.policies)).toHaveLength(3);
      const live = JSON.parse(
        readFileSync(new URL("../../api/src/bot/evolution/programs/preview.json", import.meta.url), "utf8"),
      );
      expect(live.engineSha256).toBe(evidence.engineSha256);
      expect(live.generic).toEqual(evidence.policies.generic.program);
      for (const [version, program] of Object.entries(live.pilots)) {
        expect(program).toEqual(evidence.policies[version].program);
      }
      for (const result of Object.values(evidence.results) as {
        allValid: boolean;
        selected: { valid: boolean; searches: { completed: number; requested: number }[] }[];
      }[]) {
        expect(result.allValid).toBe(true);
        expect(
          result.selected.every(
            (game) => game.valid && game.searches.every((search) => search.completed === search.requested),
          ),
        ).toBe(true);
      }
      await page.goto("/");
      await page.getByRole("link", { name: "Learn a deck with our strategy guides", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Strategy guides", exact: true, level: 1 })).toBeVisible();
      for (const guide of catalog) {
        const pageResponse = await page.goto(guide.url);
        expect(pageResponse?.status()).toBe(200);
        await expect(page.getByRole("heading", { name: guide.title, exact: true, level: 1 })).toBeVisible();
        await expect(page.getByText("Experimental training preview.", { exact: true })).toBeVisible();
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
        await page.keyboard.press("Tab");
        await expect(page.getByRole("link", { name: "Skip to guide", exact: true })).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(/#content$/);
        await expect
          .poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
          .toBeLessThanOrEqual(1);
        await expect(page.locator("html")).toHaveCSS("color-scheme", colorScheme);
        await page.screenshot({ path: info.outputPath(`${guide.slug}.png`), fullPage: true });
      }
      await page.getByRole("link", { name: "Play on Aegis", exact: true }).click();
      await expect(page).toHaveURL(/\/play\?utm_source=strategy-guides&utm_content=toho-braves$/);
      await new PracticePage(page).startMatch();
      await expect(page.locator('.game-player-line[data-side="opponent"]')).toContainText("Strategy Bot");
      expect(errors).toEqual([]);
    });
  }
}
