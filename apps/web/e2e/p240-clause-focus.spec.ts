import { test, expect } from "@playwright/test";
import { startBrowserServer } from "./server";

for (const width of [1440, 390]) {
  test(`P-240 separates Then and keeps its physical source clear during confirmation at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    const server = await startBrowserServer();
    try {
      await page.addInitScript(() => {
        localStorage.setItem("aegis:locale", "en");
        localStorage.setItem("aegis.action-confirmation.enabled", "false");
      });
      await page.goto("/dev/arena?scenario=arena-p240-arcturusmon-ordered-placement");
      await page.getByRole("button", { name: /^end breeding$/i }).click();
      const card = page.getByTestId("hand").getByRole("button", { name: "Select Arcturusmon", exact: true });
      await card.focus();
      await card.press("Enter");
      await page.getByRole("button", { name: /^Play Digimon$/i }).click();
      await page.getByRole("button", { name: "3 cards", exact: true }).click();
      const prompt = page.getByTestId("board-prompt");
      await expect(prompt).toBeVisible();
      await expect(prompt.locator(".board-prompt__clause")).toHaveText(/^Then, by placing 2 cards/);
      const source = page
        .locator('[data-drop="perm-you"]')
        .filter({ has: page.getByRole("img", { name: "Arcturusmon", exact: true }) });
      await expect(source).toHaveClass(/game-permanent--effect-linked/);
      const backdrop = page.locator(".decision-overlay-backdrop");
      await expect(backdrop).toHaveAttribute("data-source-permanent-id", (await source.getAttribute("data-id")) ?? "");
      await expect
        .poll(() => backdrop.evaluate((node) => getComputedStyle(node, "::before").clipPath))
        .not.toBe("none");
      await prompt.getByRole("button", { name: "Don't use", exact: true }).click();
      await expect(prompt).toBeHidden();
      await expect(source).not.toHaveClass(/game-permanent--effect-linked/);
    } finally {
      await server.close();
    }
  });
}
