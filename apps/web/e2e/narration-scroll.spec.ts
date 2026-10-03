import { expect, test } from "@playwright/test";

const formats = [
  { name: "desktop", width: 1440, height: 1000, compact: false, reduced: false },
  { name: "phone", width: 390, height: 844, compact: true, reduced: false },
  { name: "landscape", width: 844, height: 390, compact: false, reduced: true },
];

for (const format of formats) {
  test(`notice buttons reveal the queued toasts in both directions (${format.name})`, async ({ page }) => {
    await page.setViewportSize({ width: format.width, height: format.height });
    await page.emulateMedia({ reducedMotion: format.reduced ? "reduce" : "no-preference" });
    await page.goto("/dev/mobile?specimen=narration-expanded&frame=1&locale=en");
    const column = page.locator(`[data-slot="${format.compact ? "narration" : "narration-text"}"]`);
    await expect(column.locator(".narration-item")).toHaveCount(format.compact ? 5 : 3);
    const above = column.getByRole("button", { name: "Show more notices above" });
    const below = column.getByRole("button", { name: "Show more notices below" });
    const position = () => column.evaluate((element) => element.scrollTop);
    const initial = await position();

    if (format.compact) {
      await expect(below).toBeVisible();
      await below.click();
      await expect.poll(position).toBeGreaterThan(initial + 24);
      await expect(above).toBeVisible();
      const lower = await position();
      await above.click();
      await expect.poll(position).toBeLessThan(lower - 24);
      await expect(column.getByRole("button", { name: "Fold the notice back" })).toBeVisible();
    } else {
      await expect(above).toBeVisible();
      await above.click();
      await expect.poll(position).toBeLessThan(initial - 24);
      await expect(below).toBeVisible();
      const upper = await position();
      await below.click();
      await expect.poll(position).toBeGreaterThan(upper + 24);
      await expect(above).toBeVisible();
    }
  });
}
