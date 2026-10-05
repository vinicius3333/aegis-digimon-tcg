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

test("#4990 shows four phases and a turn-pass control in the repeated end-turn scenario", async ({ page }) => {
  const server = await startBrowserServer();
  try {
    await new ArenaPage(page).open("arena-issue-4990-end-of-turn-label");
    const phases = page.getByTestId("turn-phases");
    await expect(phases.getByRole("listitem", { includeHidden: true })).toHaveText([
      "Active",
      "Draw",
      "Breeding",
      "Main",
    ]);
    await page.getByRole("button", { name: /^end breeding$/i }).click();
    await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
    await expect(page.getByTestId("hand").getByRole("img", { name: "Monodramon", exact: true })).toHaveCount(2);
    await expect(page.getByRole("button", { name: /^end phase$/i })).toHaveCount(0);
    await page.getByRole("button", { name: /^end turn$/i }).click();
    await page.getByRole("button", { name: /^\[End of Your Turn\], WarGrowlmon,/ }).click();
    await page.getByRole("button", { name: /^resolve next effect$/i }).click();
    const activation = page.getByRole("region", { name: "WarGrowlmon · effect", exact: true });
    await expect(activation).toContainText("Engage");
    await expect(activation).toContainText("at the end of this turn, this Digimon may attack.");
    await expect(activation).not.toContainText("Delete 1 of your opponent's Digimon");
  } finally {
    await page.close();
    await server.close();
  }
});

test("Burst Mode hides the unpaid cost 0 route and displays its Option Main text", async ({ page }) => {
  const server = await startBrowserServer();
  try {
    await page.addInitScript(() => localStorage.setItem("aegis.action-confirmation.enabled", "false"));
    await new ArenaPage(page).open("arena-issue-4964-burst-own-tamer");
    await page.getByRole("button", { name: /^end breeding$/i }).click();
    await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
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
    await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
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
    await expect(page.getByRole("button", { name: /end turn/i })).toBeEnabled();
    await page.getByRole("button", { name: /reset combat/i }).click();
    await expect(page.getByRole("button", { name: /end breeding/i })).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    await page.close();
    await server.close();
  }
});

test("#4967 ordinary Play offers Assembly while DNA materials remain on the field", async ({ page }) => {
  const server = await startBrowserServer();
  try {
    await page.addInitScript(() => localStorage.setItem("aegis.action-confirmation.enabled", "false"));
    await new ArenaPage(page).open("arena-issue-4967-assembly-with-dna");
    await page.getByRole("button", { name: /^end breeding$/i }).click();
    await page.getByTestId("hand").getByRole("img", { name: "Omnimon", exact: true }).click();
    await page.getByRole("button", { name: /^Play Digimon$/i }).click();
    const assembly = page.getByRole("dialog", { name: "＜Assembly＞ Omnimon", exact: true });
    await expect(assembly).toBeVisible();
    await expect(page.getByText(/DNA Digivolution available/i)).not.toBeVisible();
    for (const name of ["WarGreymon", "MetalGarurumon", "Agumon", "Gabumon"])
      await assembly.getByRole("button", { name: new RegExp(`^${name}.*Trash`, "i") }).click();
    await expect(assembly.getByRole("button", { name: /Assembly.*4/i })).toBeEnabled();
  } finally {
    await page.close();
    await server.close();
  }
});

test("#4985 the second Alliance stays selectable after answering the first", async ({ page }) => {
  const server = await startBrowserServer();
  try {
    await page.addInitScript(() => localStorage.setItem("aegis.action-confirmation.enabled", "false"));
    await new ArenaPage(page).open("arena-issue-4985-double-alliance");
    await page.getByRole("button", { name: /^end breeding$/i }).click();
    await page.getByTestId("hand").getByRole("img", { name: "Jesmon", exact: true }).click();
    await page.getByRole("button", { name: "Digivolve", exact: true }).click();
    await page.locator('[data-drop="perm-you"][data-id="arena-issue-4985-double-alliance-0-field-0"]').click();
    await page
      .getByRole("region", { name: "Digivolve cost", exact: true })
      .getByRole("button", { name: /^SaviorHuckmon.*3 memory/ })
      .click();
    await page.getByRole("button", { name: /^(Don't use|No, decline)$/i }).click();
    await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
    await page.locator('[data-drop="perm-you"][data-id="arena-issue-4985-double-alliance-0-field-0"]').click();
    await page.getByRole("button", { name: "Attack", exact: true }).click();
    const security = page.locator('[data-drop="opp-security"]');
    await expect(security).toHaveClass(/game-security-shield--glow/);
    await security.click();
    await page.getByRole("button", { name: "No to all", exact: true }).click();
    await page.getByRole("button", { name: "Select all, top to bottom", exact: true }).click();
    await page
      .locator(".trigger-chooser__footer")
      .getByRole("button", { name: /resolve/i })
      .click();
    const alliance = page.getByRole("region", { name: "Alliance window", exact: true });
    await expect(alliance).toBeVisible();
    await page.locator('[data-drop="perm-you"][data-id="arena-issue-4985-double-alliance-0-field-1"]').click();
    await page.getByRole("button", { name: "Use Alliance", exact: true }).click();
    await expect(alliance).toBeVisible();
    await page.locator('[data-drop="perm-you"][data-id="arena-issue-4985-double-alliance-0-field-2"]').click();
    await page.getByRole("button", { name: "Use Alliance", exact: true }).click();
    await expect(alliance).not.toBeVisible();
  } finally {
    await page.close();
    await server.close();
  }
});
