import { test, expect } from "@playwright/test";
import { startBrowserServer } from "./server";
import { PracticePage } from "./practice-page";

let server: Awaited<ReturnType<typeof startBrowserServer>>;
test.beforeAll(async () => {
  server = await startBrowserServer({ holdBotAllTurns: false });
});
test.afterAll(async () => {
  await server?.close();
});

for (const width of [390, 1440]) {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`a new guide visitor starts real practice at ${width}px in ${colorScheme} mode`, async ({
      page,
    }, testInfo) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await page.emulateMedia({ colorScheme });
      await page.goto("/play?utm_source=strategy-guides&utm_content=fundamentals");
      await new PracticePage(page).startMatch();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
        .toBeLessThanOrEqual(1);
      await page.screenshot({ path: testInfo.outputPath("guest-practice-main.png"), fullPage: true });
      expect(errors).toEqual([]);
    });
  }
}
