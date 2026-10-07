import { expect, test, type Page } from "@playwright/test";
import { startBrowserServer } from "./server";

async function openScenario(page: Page, scenario: string) {
  await page.addInitScript(() => {
    localStorage.setItem("aegis:locale", "en");
    localStorage.setItem("aegis.action-confirmation.enabled", "false");
  });
  await page.goto(`/dev/arena?scenario=${scenario}`);
  await expect(page.getByRole("combobox", { name: "Scenario" })).toHaveValue(scenario);
  await expect(page.getByRole("dialog", { name: "Connecting bot opponent…", exact: true })).toBeHidden();
  await page.getByRole("button", { name: /^end breeding$/i }).click();
  await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
}

for (const width of [1440, 390]) {
  test(`GitHub #5073: e-Pulse selects a trash Liollmon at ${width}px`, async ({ page }) => {
    const server = await startBrowserServer();
    const id = "arena-issue-5073-epulse-trash";
    try {
      await page.setViewportSize({ width, height: 1000 });
      await openScenario(page, id);
      const epulse = page.getByTestId("hand").getByRole("button", { name: "Select e-Pulse", exact: true });
      await epulse.focus();
      await epulse.press("Enter");
      await page.getByRole("button", { name: "Play Option", exact: true }).click();
      await page.getByRole("button", { name: /^(Use|Yes, activate)$/ }).click();
      const panel = page.getByRole("dialog");
      const trashLiollmon = panel.locator(`[data-instance-id="${id}-0-trash-0"]`);
      await expect(trashLiollmon).toBeEnabled();
      await expect(panel.locator(`[data-instance-id="${id}-0-hand-1"]`)).toBeEnabled();
      await expect(panel.locator(`[data-instance-id="${id}-0-trash-1"]`)).toBeDisabled();
      await trashLiollmon.scrollIntoViewIfNeeded();
      await expect(trashLiollmon).toBeInViewport({ ratio: 1 });
      await trashLiollmon.click();
      await expect(trashLiollmon).toHaveAttribute("aria-pressed", "true");
      await panel.getByRole("button", { name: "Confirm targets", exact: true }).click();
      const field = page.locator('[data-drop="perm-you"]');
      await expect(field.getByRole("img", { name: "Liollmon", exact: true })).toBeVisible();
      await expect(field.getByRole("img", { name: "e-Pulse", exact: true })).toBeVisible();
      await expect(page.getByTestId("hand").getByRole("img", { name: "Cougarmon", exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
    } finally {
      await page.close();
      await server.close();
    }
  });
}

test("GitHub #5106: EX5 Chuumon's inherited effect replays the same Chuumon from the trash", async ({ page }) => {
  const server = await startBrowserServer();
  const id = "arena-issue-5106-chuumon-self-replay";
  try {
    await openScenario(page, id);
    await page.locator(`[data-drop="perm-you"][data-id="${id}-0-field-0"]`).click();
    await page.getByRole("button", { name: "Attack", exact: true }).click();
    await page.locator(`[data-drop="perm-opp"][data-id="${id}-1-field-0"]`).click();
    await page.getByRole("button", { name: /^(Use|Yes, activate)$/ }).click();
    const revived = page
      .locator('[data-drop="perm-you"]')
      .filter({ has: page.getByRole("img", { name: "Chuumon", exact: true }) });
    await expect(revived).toHaveAttribute("data-suspended", "true");
    await expect(page.locator(`[data-drop="perm-you"][data-id="${id}-0-field-0"]`)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
  } finally {
    await page.close();
    await server.close();
  }
});

test("GitHub #5049: BlitzGreymon declines DNA and still attacks at End of Turn", async ({ page }) => {
  const server = await startBrowserServer();
  const id = "arena-issue-5049-decline-dna";
  try {
    await openScenario(page, id);
    const security = page.locator('[data-drop="opp-security"]');
    await expect(security).toHaveAttribute("aria-label", "Opponent security · 3");
    await page.getByRole("button", { name: /^end turn$/i }).click();
    await page.getByRole("button", { name: /^(Don't use|No)$/ }).click();
    await page.getByRole("button", { name: /^(Use|Yes, activate)$/ }).click();
    const blitz = page.locator(`[data-drop="perm-you"][data-id="${id}-0-field-0"]`);
    await blitz.click();
    await page.getByRole("button", { name: "Confirm targets", exact: true }).click();
    await page.getByRole("button", { name: "Attack", exact: true }).click();
    await page.getByRole("button", { name: "Pass", exact: true }).click();
    const field = page.locator('[data-drop="perm-you"]');
    await expect(field.getByRole("img", { name: "BlitzGreymon", exact: true })).toBeVisible();
    await expect(field.getByRole("img", { name: "CresGarurumon", exact: true })).toBeVisible();
    await expect(field.getByRole("img", { name: "Omnimon Alter-S", exact: true })).toHaveCount(0);
    await expect(security).toHaveAttribute("aria-label", /Opponent security · [0-2]$/);
  } finally {
    await page.close();
    await server.close();
  }
});

async function digivolve(page: Page, name: string, permanentId: string) {
  await page.getByTestId("hand").getByRole("img", { name, exact: true }).click();
  await page.getByRole("button", { name: "Digivolve", exact: true }).click();
  await page.locator(`[data-drop="perm-you"][data-id="${permanentId}"]`).click();
}

test("GitHub #5099: Mervamon selects Iliad cards from hand and trash", async ({ page }) => {
  const server = await startBrowserServer();
  const id = "arena-issue-5099-mervamon-iliad";
  try {
    await openScenario(page, id);
    await digivolve(page, "Mervamon", `${id}-0-field-0`);
    await page.getByRole("dialog", { name: "Digivolve cost", exact: true }).getByRole("button").first().click();
    await page.getByRole("button", { name: /^(Use|Yes, activate)$/ }).click();
    const panel = page.getByRole("dialog");
    const handKamemon = panel.locator(`[data-instance-id="${id}-0-hand-1"]`);
    const trashCyclonemon = panel.locator(`[data-instance-id="${id}-0-trash-0"]`);
    await expect(handKamemon).toBeEnabled();
    await expect(trashCyclonemon).toBeEnabled();
    await handKamemon.click();
    await trashCyclonemon.click();
    await expect(handKamemon).toHaveAttribute("aria-pressed", "true");
    await expect(trashCyclonemon).toHaveAttribute("aria-pressed", "true");
    await panel.getByRole("button", { name: "Confirm targets", exact: true }).click();
    const field = page.locator('[data-drop="perm-you"]');
    await expect(field.getByRole("img", { name: "Kamemon", exact: true })).toBeVisible();
    await expect(field.getByRole("img", { name: "Cyclonemon", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
  } finally {
    await page.close();
    await server.close();
  }
});

test("GitHub #5106: KingSukamon's cost choice offers the hand Chuumon and its digivolution cards", async ({ page }) => {
  const server = await startBrowserServer();
  const id = "arena-issue-5106-king-sukamon-cost";
  try {
    await openScenario(page, id);
    await digivolve(page, "KingSukamon", `${id}-0-field-0`);
    await page.getByRole("button", { name: /^(Use|Yes, activate)$/ }).click();
    const panel = page.getByRole("dialog");
    const handChuumon = panel.locator(`[data-instance-id="${id}-0-hand-1"]`);
    await expect(handChuumon).toBeEnabled();
    await expect(panel.locator(`[data-instance-id="${id}-0-source-0-0"]`)).toBeEnabled();
    await expect(panel.locator(`[data-instance-id="${id}-0-field-0"]`)).toBeEnabled();
    await handChuumon.click();
    await expect(handChuumon).toHaveAttribute("aria-pressed", "true");
    await panel.getByRole("button", { name: "Confirm targets", exact: true }).click();
    await expect(page.locator(`[data-drop="perm-opp"][data-id="${id}-1-field-0"]`)).toContainText("Sukamon3K");
    await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
  } finally {
    await page.close();
    await server.close();
  }
});

test("GitHub #5118: BT18-030 Candlemon opens its reveal selection instead of freezing", async ({ page }) => {
  const server = await startBrowserServer();
  const id = "arena-issue-5118-candlemon-search";
  try {
    await openScenario(page, id);
    const candlemon = page.getByTestId("hand").getByRole("button", { name: "Select Candlemon", exact: true });
    await candlemon.focus();
    await candlemon.press("Enter");
    await page.getByRole("button", { name: "Play Digimon", exact: true }).click();
    const panel = page.getByRole("dialog");
    const dynasmon = panel.locator(`[data-instance-id="${id}-0-deck-2"]`);
    await expect(dynasmon).toBeEnabled();
    await expect(panel.locator(`[data-instance-id="${id}-0-deck-1"]`)).toBeDisabled();
    await expect(panel.locator(`[data-instance-id="${id}-0-deck-3"]`)).toBeDisabled();
    await dynasmon.click();
    await expect(dynasmon).toHaveAttribute("aria-pressed", "true");
    await panel.getByRole("button", { name: "Confirm targets", exact: true }).click();
    await page.getByRole("button", { name: "Confirm order", exact: true }).click();
    await expect(page.getByTestId("hand").getByRole("button", { name: "Select Dynasmon", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
  } finally {
    await page.close();
    await server.close();
  }
});

test("GitHub #5135: Ai & Mako picks among three revealed Digimon, then gains memory on a purple digivolve", async ({
  page,
}) => {
  const server = await startBrowserServer();
  const id = "arena-issue-5135-ai-mako-your-turn";
  try {
    await openScenario(page, id);
    const tamer = page.getByTestId("hand").getByRole("button", { name: "Select Ai & Mako", exact: true });
    await tamer.focus();
    await tamer.press("Enter");
    await page.getByRole("button", { name: "Play Tamer", exact: true }).click();
    const panel = page.getByRole("dialog");
    const beelzemon = panel.locator(`[data-instance-id="${id}-0-deck-2"]`);
    for (const index of [1, 2, 3])
      await expect(panel.locator(`[data-instance-id="${id}-0-deck-${index}"]`)).toBeEnabled();
    await expect(panel.locator(`[data-instance-id="${id}-0-deck-4"]`)).toBeDisabled();
    await beelzemon.click();
    await expect(beelzemon).toHaveAttribute("aria-pressed", "true");
    await panel.getByRole("button", { name: "Confirm targets", exact: true }).click();
    await page.getByRole("button", { name: "Confirm order", exact: true }).click();
    const hand = page.getByTestId("hand");
    await expect(hand.getByRole("img", { name: "Beelzemon (X Antibody)", exact: true })).toBeVisible();
    await digivolve(page, "Porcupamon", `${id}-0-field-0`);
    await page.getByRole("button", { name: /^(Use|Yes, activate)$/ }).click();
    const drawn = hand.getByRole("button", { name: "Pick Monodramon, copy 1 of 2", exact: true });
    await drawn.focus();
    await drawn.press("Enter");
    await page.getByRole("button", { name: "End Selection", exact: true }).click();
    await expect(hand.getByRole("img", { name: "Monodramon", exact: true })).toHaveCount(1);
    await expect(
      page.locator('[data-drop="perm-you"]').filter({ has: page.getByRole("img", { name: "Ai & Mako", exact: true }) }),
    ).toHaveAttribute("data-suspended", "true");
    await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
  } finally {
    await page.close();
    await server.close();
  }
});
