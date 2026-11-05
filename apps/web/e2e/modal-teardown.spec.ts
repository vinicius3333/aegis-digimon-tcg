import { expect, test } from "@playwright/test";

for (const portal of [false, true]) {
  test(`simultaneous nested teardown restores native background focus ${portal ? "with portal" : "inline"}`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/e2e/modal-teardown.html${portal ? "?portal" : ""}`);
    const background = page.getByRole("button", { name: "Background action 0", exact: true });
    const opener = page.getByRole("button", { name: "Open parent", exact: true });
    for (let cycle = 0; cycle < 2; cycle++) {
      await opener.click();
      await page.getByRole("button", { name: "Open child", exact: true }).click();
      await page.getByRole("button", { name: "Close both", exact: true }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await background.focus();
      await expect(background).toBeFocused();
      expect(await page.locator("#preserved-inert").evaluate((element: HTMLElement) => element.inert)).toBe(true);
    }
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Background action 1", exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test(`normal nested close keeps background inert ${portal ? "with portal" : "inline"}`, async ({ page }) => {
    await page.goto(`/e2e/modal-teardown.html${portal ? "?portal" : ""}`);
    const background = page.getByRole("button", { name: "Background action 0", exact: true });
    await page.getByRole("button", { name: "Open parent", exact: true }).click();
    const childOpener = page.getByRole("button", { name: "Open child", exact: true });
    await childOpener.click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Child modal", exact: true })).toHaveCount(0);
    await expect(childOpener).toBeFocused();
    await background.evaluate((element: HTMLElement) => element.focus());
    await expect(childOpener).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await background.focus();
    await expect(background).toBeFocused();
    expect(await page.locator("#preserved-inert").evaluate((element: HTMLElement) => element.inert)).toBe(true);
  });
}
