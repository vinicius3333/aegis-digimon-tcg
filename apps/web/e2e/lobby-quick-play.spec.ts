import { expect, test } from "@playwright/test";

for (const width of [320, 768, 1024, 1440]) {
  test(`quick play uses timed BO1 without opening settings at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/e2e/lobby-formats.html");
    const summary = page.locator(".lobby-setup__summary");
    await expect(summary).toContainText("Best of 1");
    await expect(summary).toContainText("Timer ON");
    await expect(page.getByRole("combobox", { name: "Cards through", exact: true })).not.toBeVisible();
    await page.getByRole("button", { name: "Enter queue", exact: true }).click();
    await expect(page.getByRole("status", { name: "Match request" })).toContainText('"casual"');
    await expect(page.getByRole("status", { name: "Match settings" })).toHaveText(
      '{"matchTimer":true,"timerStartSeconds":300,"timerRefillSeconds":60,"bestOf":1}',
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: test.info().outputPath(`quick-play-${width}.png`), fullPage: true });
    await page.getByText("Advanced settings", { exact: true }).click();
    await expect(page.getByRole("switch", { name: "Match timer" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("radio", { name: "Best of 1" })).toHaveAttribute("aria-checked", "true");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect(errors).toEqual([]);
  });
}

test("advanced choices survive collapsing, opponent changes and reload", async ({ page }) => {
  await page.goto("/e2e/lobby-formats.html");
  const advanced = page.getByText("Advanced settings", { exact: true });
  await advanced.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("radio", { name: "Best of 3" }).click();
  await page.getByRole("switch", { name: "Match timer" }).click();
  await advanced.click();
  await expect(page.locator(".lobby-setup__summary")).toContainText("Best of 3");
  await expect(page.locator(".lobby-setup__summary")).toContainText("OFF");
  await page.getByRole("button", { name: /Practice vs AI/ }).click();
  await expect(page.getByRole("button", { name: "Play vs Bot", exact: true })).toBeEnabled();
  await expect(page.locator(".lobby-setup__summary")).toContainText("Best of 1");
  await page.getByRole("button", { name: /Private Match/ }).click();
  await expect(page.getByRole("tab", { name: "Join", exact: true })).toBeVisible();
  await expect(page.locator(".lobby-setup__summary")).toContainText("Best of 3");
  await page.getByRole("tab", { name: "Join", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Enter room code" })).toBeVisible();
  await page.reload();
  await expect(page.locator(".lobby-setup__summary")).toContainText("Best of 3");
  await expect(page.locator(".lobby-setup__summary")).toContainText("OFF");
  await expect(page.getByRole("combobox", { name: "Cards through", exact: true })).not.toBeVisible();
});
