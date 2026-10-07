import { test, expect, type Page } from "@playwright/test";
import { startBrowserServer } from "./server";

class DiscordFollowupArena {
  constructor(readonly page: Page) {}

  async open(scenario: string, beforeMain?: () => Promise<void>) {
    await this.page.addInitScript(() => {
      localStorage.setItem("aegis:locale", "en");
      localStorage.setItem("aegis.action-confirmation.enabled", "false");
    });
    // Card art is cosmetic; keep this regression independent of external mirrors.
    await this.page.route("**/assets/card-images/**", (route) =>
      route.fulfill({
        contentType: "image/png",
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=",
          "base64",
        ),
      }),
    );
    await this.page.goto(`/dev/arena?scenario=${scenario}`);
    await expect(this.page.getByRole("combobox", { name: "Scenario" })).toHaveValue(scenario);
    await this.page.getByRole("button", { name: /^end breeding$/i }).click();
    if (scenario.endsWith("-asuna")) await this.page.getByRole("button", { name: /^don.t use$/i }).click();
    await beforeMain?.();
    await expect(this.page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
    await this.page.getByText("Scenario instructions", { exact: true }).click();
  }
}

for (const [scenario, note] of [
  ["arena-discord-1556798361435373630-mococomon-once-per-turn", "same Mococomon must NOT resolve again"],
  ["arena-discord-1556772182607011971-asuna", "alternate cost 3"],
  ["arena-discord-1556772182607011971-image-training", "Both routes must appear"],
  ["arena-discord-1556772182607011971-breathing-training", "alternate TS route"],
  ["arena-discord-1556772182607011971-pagumon", "Pagumon’s inherited evolution"],
  ["arena-discord-1556772689731915896-fly-bullet-hand", "Gallantmon X must be deleted"],
  ["arena-discord-1556772689731915896-fly-bullet-sources", "Gallantmon X must be deleted"],
  ["arena-discord-1556782829713621082-digilab-breeding", "keep Veemon in breeding"],
]) {
  test(`${scenario} opens the configured board and reaches Main`, async ({ page }) => {
    const server = await startBrowserServer();
    try {
      await new DiscordFollowupArena(page).open(scenario);
      await expect(page.getByText(note, { exact: false })).toBeVisible();
      if (scenario.endsWith("digilab-breeding")) {
        await page.getByTestId("hand").getByRole("img", { name: "DigiLab", exact: true }).click();
        await expect(page.getByRole("button", { name: "Play Option", exact: true })).toBeEnabled();
        await page.getByRole("button", { name: "Play Option", exact: true }).click();
        await expect(
          page
            .locator('[data-drop="perm-you"]')
            .filter({ has: page.getByRole("img", { name: "DigiLab", exact: true }) }),
        ).toHaveCount(1);
        await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
      }
    } finally {
      await page.close();
      await server.close();
    }
  });
}

for (const [suffix, memory] of [
  ["", 5],
  ["-zero", 8],
] as const) {
  test(`Discord 1556821976922849360: Tsunomon charges the variable cost minus 1${suffix}`, async ({ page }) => {
    const server = await startBrowserServer();
    try {
      await new DiscordFollowupArena(page).open(`arena-discord-1556821976922849360-tsunomon-jupitermon${suffix}`);
      const attacker = page
        .locator('[data-drop="perm-you"]')
        .filter({ has: page.getByRole("img", { name: "Ikkakumon", exact: true }) });
      await attacker.click();
      await page.getByRole("button", { name: "Attack", exact: true }).click();
      await page.locator('[data-drop="opp-security"]').click();
      await page.getByRole("button", { name: "Use", exact: true }).click();
      await page.getByRole("button", { name: "Use", exact: true }).click();
      await expect(
        page.locator('[data-drop="perm-you"]').getByRole("img", { name: "Jupitermon", exact: true }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
      await expect(page.locator(".game-memory-gauge")).toHaveAttribute("aria-label", `Memory: +${memory}`);
    } finally {
      await page.close();
      await server.close();
    }
  });
}

for (const suffix of ["zero", "one", "multiple"]) {
  test(`Discord 1556811259867955282: ${suffix} targets share one private search and evolution modal`, async ({
    page,
  }) => {
    const server = await startBrowserServer();
    try {
      await new DiscordFollowupArena(page).open(`arena-discord-1556811259867955282-patamon-${suffix}`, async () => {
        const inspection = page.getByRole("dialog");
        await expect(inspection).toHaveCount(1);
        await expect(inspection.locator(".decision-overlay__candidate")).toHaveCount(3);
        await expect(inspection.locator(".decision-overlay__candidate:enabled")).toHaveCount(
          suffix === "zero" ? 0 : suffix === "one" ? 1 : 2,
        );
        await inspection.getByRole("button", { name: "None", exact: true }).click();
        await expect(inspection).toHaveCount(0);
      });
      await expect(
        page.locator('[data-drop="perm-you"]').filter({ has: page.getByRole("img", { name: "Patamon", exact: true }) }),
      ).toHaveCount(1);
      await expect(page.getByText("Patamon must privately show all 3 security cards", { exact: false })).toBeVisible();
    } finally {
      await page.close();
      await server.close();
    }
  });
}

for (const suffix of ["one", "multiple"]) {
  test(`Discord 1556811259867955282: ${suffix} targets evolve from the single search modal`, async ({ page }) => {
    const server = await startBrowserServer();
    try {
      await new DiscordFollowupArena(page).open(`arena-discord-1556811259867955282-patamon-${suffix}`, async () => {
        const selection = page.getByRole("dialog");
        await expect(selection).toHaveCount(1);
        const choices = selection.getByRole("button", { name: /^Unimon/ });
        await expect(choices).toHaveCount(suffix === "one" ? 1 : 2);
        // Duplicate Unimon cards are separate physical choices; deliberately pick the last copy.
        await choices.last().click();
        await selection.getByRole("button", { name: "Confirm targets", exact: true }).click();
        await page.getByRole("button", { name: /^don.t use$/i }).click();
      });
      await expect(
        page.locator('[data-drop="perm-you"]').getByRole("img", { name: "Unimon", exact: true }),
      ).toBeVisible();
      await expect(page.locator(".game-memory-gauge")).toHaveAttribute("aria-label", "Memory: +5");
    } finally {
      await page.close();
      await server.close();
    }
  });
}

test("Discord 1556810241952194590: Inferno Divide affects Alphamon after real Grademon protection", async ({
  page,
}) => {
  const server = await startBrowserServer();
  try {
    await new DiscordFollowupArena(page).open("arena-discord-1556810241952194590-cerberusmon-alphamon");
    const ownDigimon = page.locator('[data-drop="perm-you"]');
    await ownDigimon.click();
    await page.getByRole("button", { name: "Attack", exact: true }).click();
    await page.locator('[data-drop="opp-security"]').click();
    await page.getByRole("button", { name: "Select all, top to bottom", exact: true }).click();
    await page
      .locator(".trigger-chooser__footer")
      .getByRole("button", { name: /resolve/i })
      .click();
    await page.getByRole("button", { name: "Use", exact: true }).click();
    await page.getByRole("button", { name: "Alternate requirement, pays 3 memory", exact: true }).click();
    await page.getByRole("button", { name: "Use", exact: true }).click();
    await page.getByRole("button", { name: "Alternate requirement, pays 4 memory", exact: true }).click();
    await expect(ownDigimon.getByRole("img", { name: "Alphamon", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
    await page.getByRole("button", { name: /^end turn$/i }).click();
    await expect(ownDigimon.getByRole("img", { name: "Dorumon", exact: true })).toBeVisible({ timeout: 30000 });
    await expect(ownDigimon.getByRole("img", { name: "Alphamon", exact: true })).toHaveCount(0);
  } finally {
    await page.close();
    await server.close();
  }
});

test("Discord 1556831312008974437: Jesmon attacks at negative memory after gaining Gankoomon X immunity", async ({
  page,
}) => {
  const server = await startBrowserServer();
  try {
    await new DiscordFollowupArena(page).open("arena-discord-1556831312008974437-jesmon-gankoomon-immunity");
    await page.getByRole("button", { name: /^end turn$/i }).click();
    await expect(page.getByRole("button", { name: /^end breeding$/i })).toBeEnabled({ timeout: 30000 });
    await page.getByRole("button", { name: /^end breeding$/i }).click();
    await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
    await expect(
      page.locator('[data-drop="perm-opp"]').getByRole("img", { name: "Wingdramon", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".game-memory-gauge")).toHaveAttribute("aria-label", "Memory: +3");
    await page.getByTestId("hand").getByRole("img", { name: "Gankoomon", exact: true }).click();
    await page.getByRole("button", { name: "Play Digimon", exact: true }).click();
    await page.getByRole("button", { name: "Select all, top to bottom", exact: true }).click();
    await page.getByRole("button", { name: "Yes to all", exact: true }).click();
    await page
      .locator(".trigger-chooser__footer")
      .getByRole("button", { name: /resolve/i })
      .click();
    const baseChoice = page.getByRole("region", { name: "Confirm targets", exact: true });
    await expect(baseChoice).toBeVisible();
    await page.locator('[data-drop="perm-you"]').getByRole("img", { name: "Gankoomon", exact: true }).click();
    await baseChoice.getByRole("button", { name: "Confirm targets", exact: true }).click();
    await page.getByRole("button", { name: "Pick Gankoomon (X Antibody)", exact: true }).click();
    await page
      .getByRole("region", { name: "Hand selection", exact: true })
      .getByRole("button", { name: "End Selection", exact: true })
      .click();
    await expect(
      page.locator('[data-drop="perm-you"]').getByRole("img", { name: "Gankoomon (X Antibody)", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "2 cards", exact: true }).click();
    // The only legal attack target is preselected by the ordinary board selection UI.
    await page.getByRole("button", { name: "Attack", exact: true }).click();
    await expect(page.locator(".game-memory-gauge")).toHaveAttribute("aria-label", "Memory: -5");
    // Jesmon's optional When Attacking play and Alliance are independent of its watcher attack.
    await page.getByRole("button", { name: "Select all, top to bottom", exact: true }).click();
    await page.getByRole("button", { name: "No to all", exact: true }).click();
    await page
      .locator(".trigger-chooser__footer")
      .getByRole("button", { name: /resolve/i })
      .click();
    await page
      .getByRole("region", { name: "Alliance window" })
      .getByRole("button", { name: "Pass", exact: true })
      .click();
    await expect(page.getByRole("button", { name: /^end breeding$/i })).toBeEnabled({ timeout: 30000 });
    await expect(page.locator('[data-drop="opp-security"]')).toHaveAttribute("aria-label", "Opponent security · 2");
  } finally {
    await page.close();
    await server.close();
  }
});

for (const accepted of [true, false]) {
  test(`Examon BT23 Partition previews both sources and waits for explicit choice; accepted=${accepted}`, async ({
    page,
  }) => {
    const server = await startBrowserServer({ holdBotAllTurns: false });
    try {
      await new DiscordFollowupArena(page).open("arena-examon-bt23-partition-choice");
      await page.getByRole("button", { name: /^end turn$/i }).click();
      const partition = page.getByRole("dialog");
      await expect(partition.getByRole("heading", { name: "Do you want to activate Partition?" })).toBeVisible();
      await expect(partition.getByRole("img", { name: "Groundramon", exact: true })).toBeVisible();
      await expect(partition.getByRole("img", { name: "Wingdramon", exact: true })).toBeVisible();
      await expect(partition.getByRole("button", { name: "Confirm targets", exact: true })).toHaveCount(0);
      // Observe longer than the 1.901s Oracle response, without submitting any choice.
      await page.waitForTimeout(2200);
      await expect(partition.getByRole("heading", { name: "Do you want to activate Partition?" })).toBeVisible();
      await partition.getByRole("button", { name: accepted ? "Yes, activate" : "No, decline", exact: true }).click();
      await expect(partition).toHaveCount(0);
      const own = page.locator('[data-drop="perm-you"]');
      await expect(own.getByRole("img", { name: "Groundramon", exact: true })).toHaveCount(accepted ? 1 : 0);
      await expect(own.getByRole("img", { name: "Wingdramon", exact: true })).toHaveCount(accepted ? 1 : 0);
      await expect(own.getByRole("img", { name: "Examon", exact: true })).toHaveCount(0);
    } finally {
      await page.close();
      await server.close();
    }
  });
}
