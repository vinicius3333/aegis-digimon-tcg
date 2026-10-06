import { expect, test, type Page } from "@playwright/test";
import { startBrowserServer } from "./server";

class GroupArena {
  constructor(readonly page: Page) {}
  async open(suffix: string) {
    await this.page.addInitScript(() => {
      localStorage.setItem("aegis:locale", "en");
      localStorage.setItem("aegis.action-confirmation.enabled", "false");
    });
    await this.page.goto(`/dev/arena?scenario=arena-github-${suffix}`);
    await expect(this.page.getByRole("combobox", { name: "Scenario" })).toHaveValue(`arena-github-${suffix}`);
    await this.page.getByRole("button", { name: /^end breeding$/i }).click();
    if (suffix === "5116-rizegreymon") await this.page.getByRole("button", { name: "Use", exact: true }).click();
    await expect(this.page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
  }
  async play(name: string) {
    await this.page
      .getByTestId("hand")
      .getByRole("button", { name: `Select ${name}`, exact: true })
      .press("Enter");
    await this.page.getByRole("button", { name: "Play Digimon", exact: true }).click();
  }
  async option(name: string) {
    await this.page
      .getByTestId("hand")
      .getByRole("button", { name: `Select ${name}`, exact: true })
      .press("Enter");
    await this.page.getByRole("button", { name: "Play Option", exact: true }).click();
  }
  async evolve(name: string, baseId: string) {
    await this.page
      .getByTestId("hand")
      .getByRole("button", { name: `Select ${name}`, exact: true })
      .press("Enter");
    await this.page.getByRole("button", { name: "Digivolve", exact: true }).click();
    await this.page.locator(`[data-drop="perm-you"][data-id="${baseId}"]`).click();
  }
  async select(id: string) {
    const card = this.page.getByRole("dialog").locator(`[data-instance-id="${id}"]`);
    await expect(card).toBeVisible();
    await expect(card).toBeEnabled();
    await card.click();
    await this.page.getByRole("button", { name: "Confirm targets", exact: true }).click();
  }
}

test("#5136 Greymon visibly recovers EX9 Omnimon Alter-S", async ({ page }) => {
  const server = await startBrowserServer();
  try {
    const arena = new GroupArena(page);
    await arena.open("5136-greymon-recovery");
    await arena.play("Greymon");
    await page.getByRole("button", { name: "Use", exact: true }).click();
    await arena.select("arena-github-5136-greymon-recovery-0-trash-0");
    await expect(page.getByTestId("hand").getByRole("img", { name: "Omnimon Alter-S", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
  } finally {
    await page.close();
    await server.close();
  }
});
for (const [suffix, name, result] of [
  ["5124-princemamemon", "PrinceMamemon", "BigMamemon"],
  ["5124-bigmamemon", "BigMamemon", "Bokomon"],
]) {
  test(`#5124 ${name} visibly plays the revealed ${result}`, async ({ page }) => {
    const server = await startBrowserServer();
    try {
      const arena = new GroupArena(page);
      await arena.open(suffix!);
      await arena.evolve(name!, `arena-github-${suffix}-0-field-0`);
      await arena.select(`arena-github-${suffix}-0-deck-2`);
      await expect(
        page.locator('[data-drop="perm-you"]').getByRole("img", { name: result!, exact: true }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
    } finally {
      await page.close();
      await server.close();
    }
  });
}

for (const suffix of ["5151-examon-sources", "5112-plutomon", "5119-cerberusmon"]) {
  test(`${suffix}: the reported attack effect reaches a visible choice`, async ({ page }) => {
    const server = await startBrowserServer({ holdBotAllTurns: false });
    try {
      const arena = new GroupArena(page);
      await arena.open(suffix);
      await page.locator(`[data-drop="perm-you"][data-id="arena-github-${suffix}-0-field-0"]`).click();
      await page.getByRole("button", { name: "Attack", exact: true }).click();
      await page.locator(`[data-drop="perm-opp"][data-id="arena-github-${suffix}-1-field-0"]`).click();
      // Confirm the printed attack effects in the order chooser when one opens.
      const order = page.getByRole("button", { name: "Select all, top to bottom", exact: true });
      if (await order.isVisible()) {
        await order.click();
        await page.getByRole("button", { name: /resolve.*effect/i }).click();
      }
      if (suffix === "5151-examon-sources") {
        await page.getByRole("button", { name: "Use", exact: true }).click();
        await arena.select(`arena-github-${suffix}-0-source-0-0`);
        await expect(
          page.locator('[data-drop="perm-you"]').getByRole("img", { name: "Coredramon", exact: true }),
        ).toBeVisible();
      } else {
        // The hand-trash processing cost must be visible and payable.
        await page.getByTestId("hand").getByRole("button", { name: "Pick Yokomon", exact: true }).click();
        await page.getByRole("button", { name: "End Selection", exact: true }).click();
        if (suffix === "5119-cerberusmon") {
          await page.getByRole("button", { name: "Use", exact: true }).click();
          await arena.select(`arena-github-${suffix}-0-trash-0`);
          await page.getByRole("button", { name: "Yes, activate", exact: true }).click();
          await expect(
            page.locator('[data-drop="perm-you"]').getByRole("img", { name: "Goblimon", exact: true }),
          ).toBeVisible();
        } else {
          await page.getByRole("button", { name: "Use", exact: true }).click();
          await arena.select(`arena-github-${suffix}-0-trash-0`);
          await expect(
            page.locator('[data-drop="perm-you"]').getByRole("img", { name: "Gekomon", exact: true }),
          ).toBeVisible();
        }
      }
    } finally {
      await page.close();
      await server.close();
    }
  });
}

test("#5111 Jesmon offers the trash Sistermon branch in the browser", async ({ page }) => {
  const server = await startBrowserServer({ holdBotAllTurns: false });
  try {
    const arena = new GroupArena(page);
    await arena.open("5111-jesmon");
    await arena.evolve("Jesmon", "arena-github-5111-jesmon-0-field-0");
    await page.getByRole("button", { name: /SaviorHuckmon Lv.5/ }).click();
    const sistermon = page.getByRole("button", { name: "Play without paying the cost", exact: true });
    await expect(sistermon).toBeVisible();
    await sistermon.click();
    await arena.select("arena-github-5111-jesmon-0-trash-0");
    await expect(
      page.locator('[data-drop="perm-you"]').getByRole("img", { name: "Sistermon Blanc", exact: true }),
    ).toBeVisible();
  } finally {
    await page.close();
    await server.close();
  }
});

for (const suffix of ["5162-gym-security", "5162-gym-empty"]) {
  test(`#5162 ${suffix}: Security places the Gym in the browser`, async ({ page }) => {
    const server = await startBrowserServer({ holdBotAllTurns: false });
    try {
      const arena = new GroupArena(page);
      await arena.open(suffix);
      await page.locator(`[data-drop="perm-you"][data-id="arena-github-${suffix}-0-field-0"]`).click();
      await page.getByRole("button", { name: "Attack", exact: true }).click();
      await page.locator('[data-drop="opp-security"]').click();
      await expect(
        page
          .locator('[data-drop="perm-opp"]')
          .getByRole("img", { name: "The Sistermon Sisters Training Gym", exact: true }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
    } finally {
      await page.close();
      await server.close();
    }
  });
}

for (const suffix of ["5160-super-hacking", "5127-zephagamon-protection"]) {
  test(`${suffix}: deletion resolves its reactive effect`, async ({ page }) => {
    const server = await startBrowserServer({ holdBotAllTurns: false });
    try {
      const arena = new GroupArena(page);
      await arena.open(suffix);
      await arena.option("Happy Bullet Showering");
      if (suffix === "5160-super-hacking") {
        await page.getByRole("button", { name: "Use", exact: true }).click();
        await page.getByRole("button", { name: "Yes, activate", exact: true }).click();
        await arena.select(`arena-github-${suffix}-0-trash-0`);
        await expect(
          page.locator('[data-drop="perm-you"]').getByRole("img", { name: "Raidramon", exact: true }),
        ).toBeVisible();
      } else {
        await expect(
          page.locator('[data-drop="perm-opp"]').getByRole("img", { name: "Zephagamon", exact: true }),
        ).toBeVisible();
        await expect(page.getByRole("button", { name: "Agumon (Suspended)", exact: true })).toBeVisible();
      }
      await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
    } finally {
      await page.close();
      await server.close();
    }
  });
}

test("#5149 Proto Form shows both eligible sources and returns the selected card", async ({ page }) => {
  const server = await startBrowserServer({ holdBotAllTurns: false });
  try {
    const arena = new GroupArena(page);
    await arena.open("5149-proto-form");
    await page.getByRole("button", { name: /^end turn$/i }).click();
    await arena.select("arena-github-5149-proto-form-0-source-0-1");
    await expect(page.getByTestId("hand").getByRole("img", { name: "Monodramon", exact: true })).toBeVisible();
    await expect(page.locator('[data-drop="perm-you"]').getByRole("img", { name: "Agumon", exact: true })).toHaveCount(
      0,
    );
  } finally {
    await page.close();
    await server.close();
  }
});

test("#5144 Mastemon places an actively protected Infermon into security", async ({ page }) => {
  const server = await startBrowserServer({ holdBotAllTurns: false });
  try {
    const arena = new GroupArena(page);
    await arena.open("5144-mastemon-infermon");
    await page.getByRole("button", { name: /^end turn$/i }).click();
    await expect(
      page.locator('[data-drop="perm-opp"]').getByRole("img", { name: "Infermon", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: /^end breeding$/i }).click();
    await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
    await page.getByRole("button", { name: "Titamon", exact: true }).click();
    await page.getByRole("button", { name: "Attack", exact: true }).click();
    await page.locator('[data-drop="opp-security"]').click();
    await page.getByRole("button", { name: "Use", exact: true }).click();
    await page
      .locator('[data-drop="perm-opp"]')
      .filter({ has: page.getByRole("img", { name: "Infermon", exact: true }) })
      .click();
    await page.getByRole("button", { name: "Confirm targets", exact: true }).click();
    await expect(
      page.locator('[data-drop="perm-opp"]').getByRole("img", { name: "Infermon", exact: true }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Opponent security · 2$/ })).toBeVisible();
  } finally {
    await page.close();
    await server.close();
  }
});

for (const viewport of [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`#5116 ${viewport.name} RizeGreymon pays its Tamer cost and uses a DUAL Option`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const server = await startBrowserServer();
    try {
      const arena = new GroupArena(page);
      await arena.open("5116-rizegreymon");
      await arena.play("RizeGreymon");
      await page.getByRole("button", { name: "Use", exact: true }).click();
      await expect(
        page.getByTestId("hand").getByRole("button", { name: "Pick ShineGreymon", exact: true }),
      ).toBeEnabled();
      await expect(
        page.getByTestId("hand").getByRole("button", { name: "Pick Marcus Damon & Thomas H. Norstein", exact: true }),
      ).toBeEnabled();
      await page.getByTestId("hand").getByRole("button", { name: "Pick ShineGreymon", exact: true }).click();
      await page.getByRole("button", { name: "End Selection", exact: true }).click();
      await expect(page.getByRole("region", { name: "Confirm targets", exact: true })).toContainText("ShineGreymon");
      await page
        .locator('[data-drop="perm-you"]')
        .filter({ has: page.getByRole("img", { name: "RizeGreymon", exact: true }) })
        .click();
      await page.getByRole("button", { name: "Confirm targets", exact: true }).click();
      await expect(
        page.locator('[data-drop="perm-you"]').getByRole("img", { name: "ShineGreymon", exact: true }),
      ).toBeVisible();
    } finally {
      await page.close();
      await server.close();
    }
  });
}

test("#5127 LM-066 cost exposes both opposing Digimon", async ({ page }) => {
  const server = await startBrowserServer();
  try {
    const arena = new GroupArena(page);
    await arena.open("5127-zephagamon-option");
    await arena.option("Zephagamon");
    await page.getByRole("button", { name: "Use as Option", exact: true }).click();
    await page.getByRole("button", { name: "Yes, activate", exact: true }).click();
    await expect(page.getByRole("button", { name: "Agumon (Suspended)", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Agumon Expert (Suspended)", exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: "Memory: +6", exact: true })).toBeVisible();
  } finally {
    await page.close();
    await server.close();
  }
});

test("#5162 Hisyaryumon suppresses Gym Security in the browser", async ({ page }) => {
  const server = await startBrowserServer({ holdBotAllTurns: false });
  try {
    const arena = new GroupArena(page);
    await arena.open("5162-gym-suppressed");
    await page.getByRole("button", { name: "Alphamon", exact: true }).click();
    await page.getByRole("button", { name: "Attack", exact: true }).click();
    await page.locator('[data-drop="opp-security"]').click();
    await expect(page.getByRole("img", { name: "Opponent security · 0", exact: true })).toBeVisible();
    await expect(
      page
        .locator('[data-drop="perm-opp"]')
        .getByRole("img", { name: "The Sistermon Sisters Training Gym", exact: true }),
    ).toHaveCount(0);
  } finally {
    await page.close();
    await server.close();
  }
});
