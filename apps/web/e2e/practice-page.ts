import { expect, type Page } from "@playwright/test";

/** Product controls only: no test game state, scripted bot, or intercepted requests. */
export class PracticePage {
  constructor(readonly page: Page) {}

  async startMatch() {
    await this.page.getByRole("button", { name: /Practice vs AI/i }).click();
    await this.page.getByRole("button", { name: "Play vs Bot", exact: true }).click();
    await expect(this.page).toHaveURL(/\/game(?:\?.*)?$/);
    await this.page.getByRole("button", { name: "Keep hand", exact: true }).click();
    await expect(this.page.locator('.game-player-line[data-side="opponent"]')).toContainText(/Bot|BT26 AI/);
    await expect(this.page.getByTestId("hand")).toBeVisible();
    await this.ready();
  }

  async ready() {
    // A bot that starts first must finish its real turn before these controls appear.
    await this.page.getByRole("button", { name: /^end breeding$/i }).click({ timeout: 60_000 });
    await expect(this.page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
    await expect(this.page.locator(".game-draw-presentation")).toHaveCount(0);
  }
}
