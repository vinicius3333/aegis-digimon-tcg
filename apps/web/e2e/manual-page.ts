import { expect, type Page } from "@playwright/test";

export class ManualPage {
  constructor(readonly page: Page) {}
  async lobby() {
    await this.page.addInitScript(() => localStorage.setItem("aegis:locale", "en"));
    await this.page.goto("/play");
    await this.page.getByRole("button", { name: /Manual table.*Players resolve/ }).click();
  }
  async queue() {
    await this.page.getByRole("button", { name: "Enter queue", exact: true }).click();
    await expect(this.page.getByRole("main", { name: "Manual table" })).toBeVisible();
  }
  async host() {
    await this.page
      .getByRole("group", { name: "Manual table" })
      .getByRole("button", { name: "Create", exact: true })
      .click();
    await this.page.getByRole("button", { name: "Create manual room", exact: true }).click();
  }
  get table() {
    return this.page.getByRole("main", { name: "Manual table" });
  }
  async ready() {
    await this.page.getByRole("button", { name: "Ready", exact: true }).click();
  }
  async draw() {
    await this.page.getByRole("button", { name: "Draw", exact: true }).click();
  }
}
