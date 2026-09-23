import { expect, type Locator, type Page } from "@playwright/test";

export class GamePage {
  constructor(readonly page: Page) {}
  async endBreeding() {
    await this.page.getByRole("button", { name: /^end breeding$/i }).click();
    await expect(this.page.getByRole("button", { name: /^end phase$/i })).toBeEnabled();
  }
  async play(name: RegExp) {
    // Copies are interchangeable before play; assertions capture the actual played instance.
    await this.page.getByTestId("hand").getByRole("img", { name }).first().click();
    await this.page.getByRole("button", { name: /play (digimon|tamer|option)/i }).click();
  }
  async dragCardTo(name: RegExp, target: Locator) {
    const card = this.page.getByTestId("hand").getByRole("img", { name });
    await card.scrollIntoViewIfNeeded();
    const from = await card.boundingBox();
    const to = await target.boundingBox();
    expect(from).not.toBeNull();
    expect(to).not.toBeNull();
    await this.page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(to!.x + to!.width / 2, to!.y + to!.height / 2, { steps: 20 });
    await this.page.mouse.up();
  }
}
