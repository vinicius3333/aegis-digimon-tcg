import { waitForPackOpeningScene } from "./waitForPackOpeningScene";
import { writeFile } from "node:fs/promises";
import { pausePackOpeningAnimations } from "./pausePackOpeningAnimations";
import { togglePackOpeningCheckbox } from "./togglePackOpeningCheckbox";
import { activatePackOpeningButton } from "./activatePackOpeningButton";
const evidence = process.env.AEGIS_SEALED_EVIDENCE_DIR ?? "test-results/sealed/swiss";
import { randomUUID } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import type { SealedOwnPool } from "@aegis/shared/sealed/SealedContracts";
import { startSealedBrowserServer } from "../../api/test-support/startSealedBrowserServer";
import { getSealedConfiguration } from "@aegis/shared/sealed/getSealedConfiguration";
import { getCardDefinition } from "@aegis/shared/cards/registry";
import { CardKind } from "@aegis/shared/schema/enums";

let backend: Awaited<ReturnType<typeof startSealedBrowserServer>>;
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: Date.now() - 1000 });
});
test.beforeAll(async () => {
  backend = await startSealedBrowserServer({
    connectionString: process.env.SEALED_TEST_DATABASE_URL,
    port: Number(process.env.AEGIS_E2E_EDGE_PORT ?? 2569),
  });
});
test.afterAll(async () => {
  await backend?.close();
});

for (const width of [390, 1440]) {
  for (const dark of [false, true]) {
    test(`builds and locks a real allocated deck at ${width}px in ${dark ? "dark" : "light"} mode`, async ({
      page,
      context,
      browser,
    }) => {
      const { accounts, participants, sealed } = backend;
      const owner = await accounts.accountForIdentity("discord", randomUUID(), "Browser owner");
      const opponent = await accounts.accountForIdentity("discord", randomUUID(), "Browser opponent");
      const setId = width < 960 ? "EX13" : "BT26";
      const event = await accounts.createTournament(owner.id, {
        name: "Browser sealed",
        block: "BT4",
        startsAt: Date.now(),
        maxPlayers: 8,
        structure: "swiss",
        bestOf: 3,
        sealedConfiguration: getSealedConfiguration({ setId }),
      });
      for (const account of [owner, opponent]) {
        await participants.register({ tournamentId: event.id, accountId: account.id });
        await participants.checkIn({ tournamentId: event.id, accountId: account.id });
      }
      await participants.closeCheckIn({ tournamentId: event.id });
      const own = (await sealed.getOwnPool({ tournamentId: event.id, accountId: owner.id }))!;
      expect(own.configuration.setId).toBe(setId);
      const other = (await sealed.getOwnPool({ tournamentId: event.id, accountId: opponent.id }))!;
      const session = await accounts.issueSession(owner);
      await context.addCookies([{ name: "aegis_session", value: session.id, domain: "127.0.0.1", path: "/" }]);
      await page.addInitScript((value) => {
        localStorage.setItem("aegis:darkMode", String(value));
      }, dark);
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`/e2e/sealed.html?id=${event.id}`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "Your pool & deck" })).toBeVisible();
      await expect(page.locator("[data-pool-card]")).toHaveCount(0);
      await expect(page.locator(".deck-builder-page")).toHaveCount(0);
      await pausePackOpeningAnimations({ page });
      await page.getByRole("button", { name: "Open packs" }).click();
      await waitForPackOpeningScene({ page });
      await expect(page.locator(".pack-opening canvas")).toBeVisible();
      await togglePackOpeningCheckbox({ page, name: "Skip animations" });
      await activatePackOpeningButton({ page, name: "Open pack" });
      await expect(page.getByRole("heading", { name: "All cards (12)", exact: true })).toBeVisible();
      await page.screenshot({
        path: `${evidence}/swiss-opening-${width}-${dark ? "dark" : "light"}.png`,
        fullPage: true,
      });
      await activatePackOpeningButton({ page, name: "Open all packs (5)" });
      await expect(page.locator(".pack-result-card")).toHaveCount(60);
      await expect(page.locator(".sealed-builder__header")).toContainText("6 / 6 packs opened");
      await activatePackOpeningButton({ page, name: "Back to deck building" });
      await expect(page.locator(".pack-opening-page")).toHaveCount(0);
      await page.clock.resume();

      const pulls = own.packs.flat();
      const selected = pulls
        .filter((pull) => !getCardDefinition(pull.cardId)!.kinds.includes(CardKind.DigiEgg))
        .slice(0, 40)
        .map((pull) => pull.artId ?? pull.cardId);
      const counts = new Map<string, number>();
      for (const printing of selected) {
        const cardId = pulls.find((pull) => (pull.artId ?? pull.cardId) === printing)!.cardId;
        counts.set(cardId, (counts.get(cardId) ?? 0) + 1);
      }
      for (const [cardId, count] of [...counts].sort(([left], [right]) => left.localeCompare(right))) {
        const card = page.locator(`[data-pool-card="${cardId}"]`);
        if ((await card.count()) === 0) {
          await page.locator(".deck-card-pool").evaluate((element) => {
            element.scrollTop = element.scrollHeight;
          });
        }
        for (let copy = 0; copy < count; copy++) {
          await card.getByRole("button", { name: "Add", exact: true }).click();
        }
      }
      if (width < 960) {
        await page.getByRole("button", { name: /^View deck/ }).click();
      }
      await expect(page.getByRole("button", { name: "Ready" })).toBeEnabled();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

      await page.screenshot({
        path: `${evidence}/swiss-builder-${width}-${dark ? "dark" : "light"}.png`,
        fullPage: true,
      });
      const opponentContext = await browser.newContext();
      try {
        const opponentSession = await accounts.issueSession(opponent);
        await opponentContext.addCookies([
          { name: "aegis_session", value: opponentSession.id, domain: "127.0.0.1", path: "/" },
        ]);
        const opponentPage = await opponentContext.newPage();
        await opponentPage.clock.install({ time: Date.now() - 1000 });
        await opponentPage.goto(`/e2e/sealed.html?id=${event.id}`, { waitUntil: "domcontentloaded" });
        await openAndReadyPool({ page: opponentPage, pool: other });
      } finally {
        await opponentContext.close();
      }
      await page.getByRole("button", { name: "Ready" }).click();
      await expect(page.getByText("Submission accepted")).toBeVisible();
      expect((await accounts.tournament(event.id))!.status).toBe("in_progress");
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.getByRole("status", { name: "Deck locked outside preparation.", exact: true })).toBeVisible();
      await expect(
        page
          .locator("[data-pool-card]")
          .first()
          .getByRole("button", { name: /Add|Max/, exact: true }),
      ).toBeDisabled();
      const locked = (await sealed.getOwnPool({ tournamentId: event.id, accountId: owner.id }))!;
      expect(locked.packs).toEqual(own.packs);
      expect(locked.deck!.mainDeck).toHaveLength(40);
      expect(locked.ready).toBe(false);
      expect(locked.window).toBeNull();
      expect(locked.editable).toBe(false);
      await writeFile(
        `${evidence}/swiss-${width}-${dark ? "dark" : "light"}-result.json`,
        JSON.stringify(
          {
            configuration: locked.configuration,
            packs: locked.packs.length,
            pulls: locked.packs.flat().length,
            deck: locked.deck,
            ready: locked.ready,
            editable: locked.editable,
            revision: locked.revision,
            window: locked.window,
            poolConserved: true,
            status: (await accounts.tournament(event.id))!.status,
          },
          null,
          2,
        ),
      );
    });
  }
}

type OpponentPoolParams = { page: Page; pool: SealedOwnPool };
async function openAndReadyPool({ page, pool }: OpponentPoolParams) {
  await expect(page.getByRole("heading", { name: "Your pool & deck" })).toBeVisible();
  await expect(page.locator("[data-pool-card]")).toHaveCount(0);
  await pausePackOpeningAnimations({ page });
  await page.getByRole("button", { name: "Open packs", exact: true }).click();
  await waitForPackOpeningScene({ page });
  await togglePackOpeningCheckbox({ page, name: "Skip animations" });
  await activatePackOpeningButton({ page, name: "Open all packs (6)" });
  await expect(page.locator(".pack-result-card")).toHaveCount(72);
  await activatePackOpeningButton({ page, name: "Back to deck building" });
  await page.clock.resume();
  const cards = pool.packs.flat();
  const selected = cards
    .filter((pull) => !getCardDefinition(pull.cardId)!.kinds.includes(CardKind.DigiEgg))
    .slice(0, 40);
  const counts = new Map<string, number>();
  for (const card of selected) {
    counts.set(card.cardId, (counts.get(card.cardId) ?? 0) + 1);
  }
  for (const [cardId, count] of [...counts].sort(([left], [right]) => left.localeCompare(right))) {
    const card = page.locator(`[data-pool-card="${cardId}"]`);
    if ((await card.count()) === 0) {
      await page.locator(".deck-card-pool").evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
    }
    for (let copy = 0; copy < count; copy++) {
      await card.getByRole("button", { name: "Add", exact: true }).click();
    }
  }
  await page.getByRole("button", { name: "Ready", exact: true }).click();
  await expect(page.getByRole("status", { name: "Ready · deck locked", exact: true })).toBeVisible();
}
