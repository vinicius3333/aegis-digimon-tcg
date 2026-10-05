import { test, expect, type Page } from "@playwright/test";
import { startBrowserServer } from "./server";

class ArenaPage {
  constructor(readonly page: Page) {}
  async open(scenario: string) {
    await this.page.addInitScript(() => localStorage.setItem("aegis:locale", "en"));
    await this.page.goto(`/dev/arena?scenario=${scenario}`);
    await expect(this.page.getByRole("combobox", { name: "Scenario" })).toHaveValue(scenario);
    await expect(this.page.getByRole("button", { name: /^end breeding$/i })).toBeVisible();
  }
}

test("Burst Mode hides the unpaid cost 0 route and displays its Option Main text", async ({ page }) => {
  const server = await startBrowserServer();
  try {
    await page.addInitScript(() => localStorage.setItem("aegis.action-confirmation.enabled", "false"));
    await new ArenaPage(page).open("arena-issue-4964-burst-own-tamer");
    await page.getByRole("button", { name: /^end breeding$/i }).click();
    await expect(page.getByRole("button", { name: /^end phase$/i })).toBeEnabled();
    await page.getByTestId("hand").getByRole("img", { name: "ShineGreymon: Burst Mode", exact: true }).click();
    await page.getByRole("button", { name: "Digivolve", exact: true }).click();
    await page.locator('[data-drop="perm-you"][data-id="arena-issue-4964-burst-own-tamer-0-field-0"]').click();
    const activation = page.getByRole("region", { name: "ShineGreymon: Burst Mode · effect", exact: true });
    await expect(activation).toBeVisible();
    await expect(page.getByRole("region", { name: "Digivolve cost", exact: true })).not.toBeVisible();
    await expect(activation).toContainText("[Main]");
    await expect(activation).toContainText("-15000 DP");
    await activation.getByRole("button", { name: "Use", exact: true }).click();
    await expect(page.getByRole("button", { name: /^no selection$/i })).toBeVisible();
    const selection = page.getByRole("region", { name: "Hand selection", exact: true });
    await expect(selection).toContainText("[Main]");
    await expect(selection).toContainText("-15000 DP");
    await expect(selection).toContainText("Tamer card from your hand");
    await expect(selection).not.toContainText("Activate 1 [Main] effect");
    await selection.getByRole("button", { name: /^no selection$/i }).click();
    await expect(selection).not.toBeVisible();
    await expect(page.getByRole("button", { name: /^end phase$/i })).toBeEnabled();
  } finally {
    await page.close();
    await server.close();
  }
});

test("#4954 LordKnightmon's hand inspector shows the corrected printed Main and Security text", async ({ page }) => {
  const server = await startBrowserServer();
  try {
    await new ArenaPage(page).open("arena-issue-4954-lordknightmon-inspector");
    await page
      .locator(".game-hand-card")
      .filter({ has: page.getByRole("img", { name: "LordKnightmon", exact: true }) })
      .click();
    const inspector = page.getByRole("dialog", { name: "LordKnightmon", exact: true });
    await expect(inspector).toBeVisible();
    await expect(inspector.locator('[data-role="top"]')).toContainText(
      "if you have a Digimon with [Knightmon] or [Lucemon] in its name, reduce the play cost by 5",
    );
    await expect(inspector.locator('[data-role="top"]')).toContainText("[All Turns] [Once Per Turn]");
    await expect(inspector.locator('[data-role="top"]')).not.toContainText("4 or more cards");
    await expect(inspector.locator('[data-role="printed-security"]')).toContainText("[Security]");
    await expect(inspector.locator('[data-role="printed-security"]')).toContainText("play cost of 3 or less");
    await inspector.getByRole("button", { name: "Close", exact: true }).click();
    await expect(inspector).not.toBeVisible();
  } finally {
    await page.close();
    await server.close();
  }
});

test("#4958/#4928 renders arena card art when every mirror request fails", async ({ page }) => {
  const server = await startBrowserServer();
  const officialRequests: string[] = [];
  try {
    await page.route("**/assets/card-images/**", (route) => route.abort("failed"));
    await page.route("https://world.digimoncard.com/images/cardlist/card/**", (route) => {
      officialRequests.push(route.request().url());
      return route.fulfill({
        contentType: "image/png",
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=",
          "base64",
        ),
      });
    });
    await new ArenaPage(page).open("arena-issue-4958-card-images");
    await expect.poll(() => officialRequests.some((url) => url.endsWith("BT1-010.png"))).toBe(true);
    await expect
      .poll(() =>
        page
          .getByRole("img", { name: "Agumon", exact: true })
          .evaluateAll((images) =>
            images.some(
              (image) =>
                image instanceof HTMLImageElement &&
                image.complete &&
                image.naturalWidth > 0 &&
                image.src.startsWith("https://world.digimoncard.com/"),
            ),
          ),
      )
      .toBe(true);
  } finally {
    await page.close();
    await server.close();
  }
});

test("#4943 changing phases and resetting the arena survives translated Text nodes", async ({ page }) => {
  const server = await startBrowserServer();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await new ArenaPage(page).open("arena-issue-4943-browser-translation");
    await page.evaluate(() => {
      const root = document.getElementById("root")!;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const texts: Text[] = [];
      while (walker.nextNode()) {
        const text = walker.currentNode as Text;
        if (text.textContent?.trim() && !text.parentElement?.closest("script, style")) texts.push(text);
      }
      for (const text of texts) {
        const parent = text.parentNode!;
        const translated = document.createElement("font");
        translated.style.verticalAlign = "inherit";
        translated.textContent = `ES: ${text.nodeValue}`;
        parent.insertBefore(translated, text);
        parent.removeChild(text);
      }
    });
    await page.getByRole("button", { name: /end breeding/i }).click();
    await expect(page.getByRole("button", { name: /end phase/i })).toBeEnabled();
    await page.getByRole("button", { name: /reset combat/i }).click();
    await expect(page.getByRole("button", { name: /end breeding/i })).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    await page.close();
    await server.close();
  }
});
