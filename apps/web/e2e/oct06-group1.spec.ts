import { expect, test, type Page } from "@playwright/test";
import { startBrowserServer } from "./server";

class Group1Arena {
  constructor(readonly page: Page) {}
  async open(slug: string, endBreeding = true) {
    const scenario = `arena-issue-${slug}`;
    await this.page.addInitScript(() => {
      localStorage.setItem("aegis:locale", "en");
      localStorage.setItem("aegis.action-confirmation.enabled", "false");
    });
    await this.page.goto(`/dev/arena?scenario=${scenario}`);
    await expect(this.page.getByRole("combobox", { name: "Scenario" })).toHaveValue(scenario);
    if (endBreeding) {
      await this.page.getByRole("button", { name: /^end breeding$/i }).click();
      await expect(this.page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
    }
    return scenario;
  }
  async play(name: string, action = "Play Digimon") {
    const card = this.page.getByTestId("hand").getByRole("button", { name: `Select ${name}`, exact: true });
    await card.focus();
    await card.press("Enter");
    await this.page.getByRole("button", { name: action, exact: true }).click();
  }
}

for (const [slug, name, count] of [
  ["5125-ulforce-gold", "UlforceVeedramon", 3],
  ["5128-craniamon", "Craniamon", 3],
  ["5145-slayerdramon", "Slayerdramon", 3],
  ["5146-breakdramon", "Breakdramon", 3],
  ["5140-merciful", "Omnimon: Merciful Mode", 6],
  ["5154-dantemon", "Dantemon", 7],
  ["5156-giant-slayer", "Giant Slayer", 5],
] as const) {
  test(`#${slug}: manual Assembly gallery consumes every selected material`, async ({ page }) => {
    const server = await startBrowserServer();
    try {
      const arena = new Group1Arena(page);
      const scenario = await arena.open(slug);
      await arena.play(name);
      const panel = page.getByRole("dialog", { name: `＜Assembly＞ ${name}`, exact: true });
      const materials = panel.locator(".material-prompt__body").getByRole("button");
      await expect(materials).toHaveCount(count);
      for (const material of await materials.all()) {
        await expect(material).toBeVisible();
        await material.click();
        await expect(material).toHaveAttribute("aria-pressed", "true");
      }
      const confirm = panel.getByRole("button", { name: `Assembly (${count} cards)`, exact: true });
      await expect(confirm).toBeEnabled();
      await confirm.click();
      await expect(panel).not.toBeVisible();
      await expect(page.locator('[data-drop="perm-you"]').getByRole("img", { name, exact: true })).toBeVisible();
      // Resolve the simultaneous On Play chooser and decline optional clauses.
      await expect(async () => {
        const selectAll = page.getByRole("button", { name: "Select all, top to bottom", exact: true });
        if (await selectAll.isVisible()) {
          await page.getByRole("button", { name: "No to all", exact: true }).click();
          await selectAll.click();
          await page.getByRole("button", { name: /resolve/i }).click();
        }
        const decline = page.getByRole("button", { name: /^(decline|don.t use)$/i });
        if (await decline.isVisible()) await decline.click();
        await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
      }).toPass({ timeout: 30000 });
      expect(scenario).toContain(slug);
    } finally {
      if (test.info().status !== test.info().expectedStatus) {
        await test
          .info()
          .attach("arena-state", { body: await page.locator("body").innerText(), contentType: "text/plain" });
      }
      await page.close();
      await server.close();
    }
  });
}

for (const width of [1440, 390]) {
  test(`#5161: printed-zero-DP Larva can move at ${width}px`, async ({ page }) => {
    const server = await startBrowserServer();
    try {
      await page.setViewportSize({ width, height: 1000 });
      const id = await new Group1Arena(page).open("5161-larva-breeding", false);
      await expect(page.getByRole("button", { name: /^end breeding$/i })).toBeEnabled();
      await page.locator('[data-drop="breeding-you"]').click();
      await expect(page.locator(`[data-drop="perm-you"][data-id="${id}-0-field-1"]`)).toBeVisible();
      await expect(async () => {
        const decline = page.getByRole("button", { name: /^(decline|don.t use)$/i });
        if (await decline.isVisible()) await decline.click();
        const noSelection = page.getByRole("button", { name: /^no selection$/i });
        if (await noSelection.isVisible()) await noSelection.click();
        await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled({ timeout: 1000 });
      }).toPass({ timeout: 30000 });
    } finally {
      if (test.info().status !== test.info().expectedStatus) {
        await test
          .info()
          .attach("arena-state", { body: await page.locator("body").innerText(), contentType: "text/plain" });
      }
      await page.close();
      await server.close();
    }
  });
}

for (const slug of ["5129-hyogamon-trash", "5129-goblimon-trash", "5115-melting-trash"]) {
  test(`#${slug}: the browser completes the trash evolution route`, async ({ page }) => {
    const server = await startBrowserServer();
    try {
      const arena = new Group1Arena(page);
      const id = await arena.open(slug);
      await arena.play(
        slug.includes("melting") ? "Yuuki" : "Ogremon",
        slug.includes("melting") ? "Play Tamer" : "Play Digimon",
      );
      if (!slug.includes("melting")) {
        const discard = page.getByTestId("hand").locator(`[data-hand-instance-id="${id}-0-hand-1"]`);
        await expect(discard).toHaveAttribute("aria-label", /^Pick /);
        await discard.focus();
        await discard.press("Enter");
        await page.getByRole("button", { name: /^end selection$/i }).click();
      }
      await page.getByRole("button", { name: /^use$/i }).click();
      if (slug.includes("melting")) {
        await page.getByRole("button", { name: "Yes, activate", exact: true }).click();
      }
      const evolution = page.getByRole("dialog").locator(`[data-instance-id="${id}-0-trash-0"]`);
      await expect(evolution).toBeVisible();
      await evolution.click();
      await page.getByRole("button", { name: "Confirm targets", exact: true }).click();
      if (slug.includes("melting")) {
        const choice = page.getByRole("dialog", { name: "Digivolve", exact: true });
        await choice.getByRole("button", { name: "Printed requirement, pays 1 memory", exact: true }).click();
      }
      const name = slug.includes("melting") ? "QueenBeemon" : "Titamon";
      await expect(page.locator('[data-drop="perm-you"]').getByRole("img", { name, exact: true })).toBeVisible();
      await expect(async () => {
        const decline = page.getByRole("button", { name: /^(decline|don.t use)$/i });
        if (await decline.isVisible()) await decline.click();
        const noSelection = page.getByRole("button", { name: /^no selection$/i });
        if (await noSelection.isVisible()) await noSelection.click();
        await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled({ timeout: 1000 });
      }).toPass({ timeout: 30000 });
    } finally {
      if (test.info().status !== test.info().expectedStatus) {
        await test
          .info()
          .attach("arena-state", { body: await page.locator("body").innerText(), contentType: "text/plain" });
      }
      await page.close();
      await server.close();
    }
  });
}

test("#5104: manually select both digivolution cards after End of Attack", async ({ page }) => {
  const server = await startBrowserServer();
  try {
    const id = await new Group1Arena(page).open("5104-alter-s-sources");
    await page.locator(`[data-drop="perm-you"][data-id="${id}-0-field-0"]`).click();
    await page.getByRole("button", { name: "Attack", exact: true }).click();
    await page.locator('[data-drop="opp-security"]').click();
    await page.getByRole("button", { name: "Use", exact: true }).click();
    for (const source of [0, 2]) {
      const panel = page.getByRole("dialog");
      const candidate = panel.locator(`[data-instance-id="${id}-0-source-0-${source}"]`);
      await expect(candidate).toBeVisible();
      await candidate.click();
      await expect(candidate).toHaveAttribute("aria-pressed", "true");
      await panel.getByRole("button", { name: "Confirm targets", exact: true }).click();
    }
    for (const name of ["Greymon", "Garurumon"]) {
      await expect(page.locator('[data-drop="perm-you"]').getByRole("img", { name, exact: true })).toBeVisible();
    }
    await expect(page.locator(`[data-drop="perm-you"][data-id="${id}-0-field-0"]`)).toHaveCount(0);
    await page.getByRole("button", { name: "No to all", exact: true }).click();
    await page.getByRole("button", { name: "Select all, top to bottom", exact: true }).click();
    await page.getByRole("button", { name: /resolve/i }).click();
    await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
  } finally {
    if (test.info().status !== test.info().expectedStatus) {
      await test
        .info()
        .attach("arena-state", { body: await page.locator("body").innerText(), contentType: "text/plain" });
    }
    await page.close();
    await server.close();
  }
});

for (const slug of ["5122-ulforce-bt13", "5125-ulforce-bt11"]) {
  test(`#${slug}: older Ulforce plays without an Assembly declaration`, async ({ page }) => {
    const server = await startBrowserServer();
    try {
      const arena = new Group1Arena(page);
      await arena.open(slug);
      await arena.play("UlforceVeedramon");
      await expect(
        page.locator('[data-drop="perm-you"]').getByRole("img", { name: "UlforceVeedramon", exact: true }),
      ).toBeVisible();
      await expect(page.getByRole("dialog", { name: /Assembly/ })).toHaveCount(0);
    } finally {
      await page.close();
      await server.close();
    }
  });
}
