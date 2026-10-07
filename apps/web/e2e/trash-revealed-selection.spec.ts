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

async function playCard(page: Page, scenario: string, name: string, action = "Play Tamer") {
  await openScenario(page, scenario);
  const card = page.getByTestId("hand").getByRole("button", { name: `Select ${name}`, exact: true });
  await card.focus();
  await card.press("Enter");
  await page.getByRole("button", { name: action, exact: true }).click();
}

for (const set of ["bt11", "bt3", "ex13"]) {
  test(`Sukamon ${set}: deletion opens revealed-card selection and confirms the chosen card`, async ({ page }) => {
    const server = await startBrowserServer();
    try {
      await openScenario(page, `arena-oct06-sukamon-${set}-deletion-search`);
      await page.locator('[data-drop="perm-you"][data-id="oct06-latest-sukamon"]').click();
      await page.getByRole("button", { name: "Attack", exact: true }).click();
      await page.locator('[data-drop="perm-opp"][data-id="oct06-latest-target"]').click();
      const panel = page.getByRole("dialog");
      const selected = panel.locator('[data-instance-id="oct06-latest-sukamon-reveal-1"]');
      await expect(selected).toBeVisible();
      await expect(panel.locator('[data-instance-id="oct06-latest-sukamon-reveal-3"]')).toBeDisabled();
      await selected.click();
      await expect(selected).toHaveAttribute("aria-pressed", "true");
      await panel.getByRole("button", { name: "Confirm targets", exact: true }).click();
      if (set === "bt3") await page.getByRole("button", { name: "Confirm order", exact: true }).click();
      if (set === "bt11")
        await expect(page.getByTestId("hand").getByRole("img", { name: "Chuumon", exact: true })).toBeVisible();
      else
        await expect(
          page.locator('[data-drop="perm-you"]').getByRole("img", { name: "Chuumon", exact: true }),
        ).toBeVisible();
      await expect(page.locator('[data-drop="perm-you"][data-id="oct06-latest-sukamon"]')).toHaveCount(0);
      await expect(panel).not.toBeVisible();
      await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
    } finally {
      await page.close();
      await server.close();
    }
  });
}

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 1024, height: 768 },
  { width: 320, height: 740 },
]) {
  test(`Discord 1557062221719142481: recover a selected trash card at ${viewport.width}px`, async ({ page }) => {
    const server = await startBrowserServer();
    try {
      await page.setViewportSize(viewport);
      await playCard(page, "arena-oct06-trash-recovery", "Matt Ishida");
      const panel = page.getByRole("dialog");
      const candidate = panel.locator('[data-instance-id="oct06-latest-purple-option"]');
      await expect(candidate).toBeVisible();
      await candidate.click();
      await expect(candidate).toHaveAttribute("aria-pressed", "true");
      await panel.getByRole("button", { name: "View board", exact: true }).click();
      await page.getByRole("button", { name: "Return to decision", exact: true }).click();
      await expect(candidate).toHaveAttribute("aria-pressed", "true");
      await panel.getByRole("button", { name: "Confirm targets", exact: true }).click();
      await expect(page.getByTestId("hand").getByRole("img", { name: "Night Raid", exact: true })).toBeVisible();
      await expect(panel).not.toBeVisible();
      await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
    } finally {
      await page.close();
      await server.close();
    }
  });

  test(`Discord 1557059213266522233: pick revealed cards into hand at ${viewport.width}px`, async ({ page }) => {
    const server = await startBrowserServer();
    try {
      await page.setViewportSize(viewport);
      await playCard(page, "arena-oct06-revealed-search", "Davis Motomiya");
      const panel = page.getByRole("dialog");
      const blue = panel.locator('[data-instance-id="oct06-latest-reveal-1"]');
      const green = panel.locator('[data-instance-id="oct06-latest-reveal-2"]');
      const red = panel.locator('[data-instance-id="oct06-latest-reveal-3"]');
      await expect(blue).toBeEnabled();
      await expect(green).toBeDisabled();
      await expect(red).toBeDisabled();
      await blue.click();
      await expect(blue).toHaveAttribute("aria-pressed", "true");
      await panel.getByRole("button", { name: "Confirm targets", exact: true }).click();
      await expect(green).toBeEnabled();
      await green.click();
      await expect(green).toHaveAttribute("aria-pressed", "true");
      await panel.getByRole("button", { name: "Confirm targets", exact: true }).click();
      const hand = page.getByTestId("hand");
      await expect(hand.getByRole("img", { name: "Armadillomon", exact: true })).toBeVisible();
      await expect(hand.getByRole("img", { name: "Goblimon", exact: true })).toBeVisible();
      await expect(panel).not.toBeVisible();
      await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
    } finally {
      await page.close();
      await server.close();
    }
  });
}

test("Discord 1557059213266522233: Assembly plays using the three selected trash materials", async ({ page }) => {
  const server = await startBrowserServer();
  try {
    await playCard(page, "arena-oct06-giromon-assembly", "Millenniummon", "Play Digimon");
    const panel = page.getByRole("dialog", { name: "＜Assembly＞ Millenniummon", exact: true });
    const materials = panel.locator(".material-prompt__body").getByRole("button");
    await expect(materials).toHaveCount(3);
    for (const material of await materials.all()) {
      await expect(material).toBeInViewport({ ratio: 1 });
      await material.click();
      await expect(material).toHaveAttribute("aria-pressed", "true");
    }
    await panel.getByRole("button", { name: "View board", exact: true }).click();
    await page.getByRole("button", { name: "Return to decision", exact: true }).click();
    for (const material of await materials.all()) await expect(material).toHaveAttribute("aria-pressed", "true");
    await panel.getByRole("button", { name: "Assembly (3 cards)", exact: true }).click();
    await expect(panel).not.toBeVisible();
    await expect(page.getByTestId("hand").getByRole("img", { name: "Millenniummon", exact: true })).toHaveCount(0);
    const source = page
      .locator('[data-drop="perm-you"]')
      .filter({ has: page.getByRole("img", { name: "Millenniummon", exact: true }) });
    await expect(source).toBeVisible();
    await page.getByRole("button", { name: "2 cards", exact: true }).click();
    const optional = page.getByRole("region", { name: "Confirm targets", exact: true });
    await expect(optional.getByText("Then, you may delete 1 Digimon.", { exact: true })).toBeVisible();
    await expect(optional.getByText("0 selected of 0–1", { exact: true })).toBeVisible();
    for (const notice of await page.getByRole("button", { name: "Dismiss notice", exact: true }).all())
      await notice.click();
    await expect(page.locator(".match-notice")).toHaveCount(0);
    await expect(source).toHaveClass(/game-permanent--effect-linked/);
    await optional.getByRole("button", { name: "Pass", exact: true }).click();
    await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
    await expect(source).not.toHaveClass(/game-permanent--effect-linked/);
  } finally {
    await page.close();
    await server.close();
  }
});

for (const width of [1440, 390]) {
  test(`Discord 1557077795321024543: KingSukamon selects trash Assembly materials at ${width}px`, async ({ page }) => {
    const server = await startBrowserServer();
    try {
      await page.setViewportSize({ width, height: 1000 });
      await playCard(page, "arena-oct06-king-sukamon-assembly", "KingSukamon", "Play Digimon");
      const panel = page.getByRole("dialog", { name: "＜Assembly＞ KingSukamon", exact: true });
      const materials = panel.locator(".material-prompt__body").getByRole("button");
      await expect(materials).toHaveCount(3);
      for (const material of await materials.all()) {
        await material.scrollIntoViewIfNeeded();
        await expect(material).toBeInViewport({ ratio: 1 });
        await material.click();
        await expect(material).toHaveAttribute("aria-pressed", "true");
      }
      await panel.getByRole("button", { name: "Assembly (3 cards)", exact: true }).click();
      await page.getByRole("button", { name: "Don't use", exact: true }).click();
      await expect(
        page.locator('[data-drop="perm-you"]').getByRole("img", { name: "KingSukamon", exact: true }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
    } finally {
      await page.close();
      await server.close();
    }
  });

  test(`Discord 1557085470129922229: Dorbickmon selects five hand materials at ${width}px`, async ({ page }) => {
    const server = await startBrowserServer();
    try {
      await page.setViewportSize({ width, height: 1000 });
      await playCard(page, "arena-oct06-dorbickmon-digixros", "Dorbickmon", "Play Digimon");
      const panel = page.getByRole("dialog", { name: "＜DigiXros＞ Dorbickmon", exact: true });
      const materials = panel.locator(".material-prompt__body button:enabled");
      await expect(materials).toHaveCount(5);
      await expect(panel.getByRole("button", { name: /Tai Kamiya/ })).toBeDisabled();
      for (const material of await materials.all()) {
        await material.scrollIntoViewIfNeeded();
        await expect(material).toBeInViewport({ ratio: 1 });
        await material.click();
        await expect(material).toHaveAttribute("aria-pressed", "true");
      }
      await panel.getByRole("button", { name: "DigiXros (5 cards)", exact: true }).click();
      await expect(
        page.locator('[data-drop="perm-you"]').getByRole("img", { name: "Dorbickmon", exact: true }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
    } finally {
      await page.close();
      await server.close();
    }
  });

  test(`Discord 1557077795321024543: EX5 Chuumon revives a trash Chuumon at ${width}px`, async ({ page }) => {
    const server = await startBrowserServer();
    try {
      await page.setViewportSize({ width, height: 1000 });
      await openScenario(page, "arena-oct06-chuumon-trash-revival");
      await page.locator('[data-drop="perm-you"][data-id="oct06-latest-revival-host"]').click();
      await page.getByRole("button", { name: "Attack", exact: true }).click();
      await page.locator('[data-drop="perm-opp"][data-id="oct06-latest-revival-enemy"]').click();
      await page.getByRole("button", { name: "Yes, activate", exact: true }).click();
      const panel = page.getByRole("dialog");
      const selected = panel.locator('[data-instance-id="oct06-latest-revival-target"]');
      await expect(selected).toBeVisible();
      await selected.click();
      await expect(selected).toHaveAttribute("aria-pressed", "true");
      await panel.getByRole("button", { name: "Confirm targets", exact: true }).click();
      await expect(
        page.locator('[data-drop="perm-you"]').getByRole("img", { name: "Chuumon", exact: true }),
      ).toBeVisible();
      await expect(page.locator('[data-drop="perm-you"][data-id="oct06-latest-revival-host"]')).toHaveCount(0);
      await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
    } finally {
      await page.close();
      await server.close();
    }
  });

  test(`Discord 1557076811341500428: SnowGoblimon selects revealed cards and discards at ${width}px`, async ({
    page,
  }) => {
    const server = await startBrowserServer();
    try {
      await page.setViewportSize({ width, height: 1000 });
      await playCard(page, "arena-oct06-snow-goblimon-reveal", "SnowGoblimon", "Play Digimon");
      const panel = page.getByRole("dialog");
      for (const index of [1, 2]) {
        const selected = panel.locator(`[data-instance-id="oct06-latest-snow-reveal-${index}"]`);
        await expect(selected).toBeEnabled();
        await expect(panel.locator('[data-instance-id="oct06-latest-snow-reveal-3"]')).toBeDisabled();
        await selected.click();
        await expect(selected).toHaveAttribute("aria-pressed", "true");
        await panel.getByRole("button", { name: "Confirm targets", exact: true }).click();
      }
      const hand = page.getByTestId("hand");
      const discard = hand.getByRole("button", { name: "Pick Agumon", exact: true });
      await expect(page.getByRole("button", { name: "End Selection", exact: true })).toBeVisible();
      await discard.focus();
      await discard.press("Enter");
      await page.getByRole("button", { name: "End Selection", exact: true }).click();
      await expect(hand.getByRole("img", { name: "Agumon", exact: true })).toHaveCount(0);
      await expect(hand.getByRole("img", { name: "Aegiochusmon", exact: true })).toBeVisible();
      await expect(hand.getByRole("img", { name: "MetalGreymon", exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
    } finally {
      await page.close();
      await server.close();
    }
  });
}
