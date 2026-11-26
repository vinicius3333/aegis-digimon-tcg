import { selectPrivateSealedFormat } from "./selectPrivateSealedFormat";
import { admitPrivateSealedGuest } from "./admitPrivateSealedGuest";
import { waitForPackOpeningScene } from "./waitForPackOpeningScene";
import { pausePackOpeningAnimations } from "./pausePackOpeningAnimations";
import { togglePackOpeningCheckbox } from "./togglePackOpeningCheckbox";
import { activatePackOpeningButton } from "./activatePackOpeningButton";
import { writeFile } from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";
import { startPrivateSealedBrowserServer } from "../../api/test-support/startPrivateSealedBrowserServer";
import { getCardDefinition } from "@aegis/shared/cards/registry";
import { Phase, CardKind } from "@aegis/shared/schema/enums";
import type { PrivateSealedView } from "@aegis/shared/sealed/private/PrivateSealedContracts";

let backend: Awaited<ReturnType<typeof startPrivateSealedBrowserServer>>;
const api = `http://127.0.0.1:${process.env.AEGIS_E2E_EDGE_PORT ?? 2569}`;
test.use({
  trace: process.env.AEGIS_RECORD_SEALED === "true" ? "off" : "retain-on-failure",
  video:
    process.env.AEGIS_RECORD_SEALED_PREPARATION === "false" ? "off" : { mode: "on", size: { width: 960, height: 667 } },
});
const evidence = process.env.AEGIS_SEALED_EVIDENCE_DIR ?? "test-results/sealed/private";
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: Date.now() - 1000 });
});
test.beforeAll(async () => {
  backend = await startPrivateSealedBrowserServer({
    connectionString: process.env.SEALED_TEST_DATABASE_URL,
    port: Number(process.env.AEGIS_E2E_EDGE_PORT ?? 2569),
  });
});
test.afterAll(async () => {
  await backend?.close();
});
async function getView(page: Page, code: string): Promise<PrivateSealedView> {
  return (await page.request.get(`${api}/private-sealed/${code}`)).json();
}
async function buildDeck(page: Page, view: PrivateSealedView, lock = true) {
  const cards = view.pool.packs.flat();
  const selected = cards
    .filter((card) => !getCardDefinition(card.cardId)!.kinds.includes(CardKind.DigiEgg))
    .slice(0, 40)
    .map((card) => card.artId ?? card.cardId);
  const counts = new Map<string, number>();
  for (const printing of selected) {
    const cardId = cards.find((card) => (card.artId ?? card.cardId) === printing)!.cardId;
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
  if (lock && (page.viewportSize()?.width ?? 1440) < 960) {
    await page.getByRole("button", { name: /^View deck/ }).click();
  }
  if (lock) {
    await page.getByRole("button", { name: "Ready", exact: true }).click();
    await expect(page.getByRole("status", { name: "Ready · deck locked", exact: true })).toBeVisible();
  }
}
for (const width of [390, 1440]) {
  for (const dark of [false, true]) {
    test(`creates and reveals private pools at ${width}px ${dark ? "dark" : "light"}`, async ({ page }) => {
      await page.addInitScript((value) => localStorage.setItem("aegis:darkMode", String(value)), dark);
      await page.setViewportSize({ width, height: 1000 });
      await page.goto("/play");
      await selectPrivateSealedFormat({ page: page });
      await expect(page.getByRole("textbox", { name: "Player name", exact: true })).toHaveCount(0);
      await page.getByRole("combobox", { name: "Booster series", exact: true }).selectOption("BT26");
      await expect(page.locator(".sealed-product__art")).toHaveAttribute("src", "/sets/BT26.jpg");
      await page.screenshot({ path: `${evidence}/selector-${width}-${dark ? "dark" : "light"}.png`, fullPage: true });
      await page.getByRole("button", { name: "Create", exact: true }).click();
      await admitPrivateSealedGuest({ page, api });
      await expect(page.getByRole("heading", { name: "Your pool & deck", exact: true })).toBeVisible();
      await page.locator(".lobby-page").evaluate((element) => {
        element.scrollTop = 0;
      });
      await page.screenshot({ path: `${evidence}/overview-${width}-${dark ? "dark" : "light"}.png`, fullPage: true });
      await pausePackOpeningAnimations({ page });
      await page.getByRole("button", { name: "Open packs", exact: true }).click();
      await waitForPackOpeningScene({ page });
      await expect(page.locator(".pack-opening canvas")).toBeVisible();
      await togglePackOpeningCheckbox({ page, name: "Skip animations" });
      await activatePackOpeningButton({ page, name: "Open pack" });
      await expect(page.locator(".pack-opening")).toHaveAttribute("data-phase", "summary");
      await expect(page.getByRole("heading", { name: "All cards (12)", exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `${evidence}/opening-${width}-${dark ? "dark" : "light"}.png`, fullPage: true });
      await activatePackOpeningButton({ page, name: "Open all packs (5)" });
      await expect(page.locator(".pack-result-card")).toHaveCount(60);
      await expect(page.locator(".sealed-builder__header")).toContainText("6 / 6 packs opened");
      await activatePackOpeningButton({ page, name: "Back to deck building" });
      await expect(page.locator(".pack-opening-page")).toHaveCount(0);
      await page.clock.resume();
      const code = await page.getByTestId("private-sealed-code").innerText();
      const selected = await getView(page, code);
      expect(selected.pool.configuration.setId).toBe("BT26");
      await buildDeck(page, selected, false);
      const info = page.locator("[data-pool-card]").first().getByRole("button", { name: "Card info", exact: true });
      await info.click();
      await expect(page.getByRole("dialog", { name: "Card detail", exact: true })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog", { name: "Card detail", exact: true })).toHaveCount(0);
      await expect(info).toBeFocused();
      if (width < 960) {
        const trigger = page.getByRole("button", { name: /^View deck/ });
        await expect(trigger).toContainText("View deck");
        await expect
          .poll(() =>
            trigger.evaluate((element) => {
              const text = element.querySelector<HTMLElement>(".deck-info-trigger__text")!;
              const counts = element.querySelector<HTMLElement>(".deck-info-trigger__counts")!;
              return text.scrollWidth <= text.clientWidth && counts.scrollWidth <= counts.clientWidth;
            }),
          )
          .toBe(true);
        await page.screenshot({ path: `${evidence}/pool40-${width}-${dark ? "dark" : "light"}.png`, fullPage: true });
        await expect(page.getByRole("button", { name: "Ready", exact: true })).toBeVisible();
        const poolReady = await page.getByRole("button", { name: "Ready", exact: true }).evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          const hit = document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
          return {
            width: bounds.width,
            height: bounds.height,
            bottom: bounds.bottom,
            uncovered: hit === element || element.contains(hit),
          };
        });
        expect(poolReady.uncovered).toBe(true);
        expect(poolReady.height).toBeGreaterThanOrEqual(44);
        expect(poolReady.bottom).toBeLessThanOrEqual(1000);
        await writeFile(
          `${evidence}/pool-ready-${width}-${dark ? "dark" : "light"}.json`,
          JSON.stringify(poolReady, null, 2),
        );
        await page.getByRole("button", { name: /^View deck/ }).click();
        await expect
          .poll(() =>
            page
              .locator(".deck-current--open")
              .evaluate((element) =>
                element
                  .getAnimations()
                  .every((animation) => animation.playState === "finished" || animation.playState === "idle"),
              ),
          )
          .toBe(true);
      }
      await page.locator(".lobby-page").evaluate((element) => {
        element.scrollTop = 0;
      });
      await page.locator(".deck-card-pool").evaluate((element) => {
        element.scrollTop = 0;
      });
      await page.screenshot({ path: `${evidence}/builder-${width}-${dark ? "dark" : "light"}.png`, fullPage: true });
      const measurements = await page.getByRole("button", { name: "Ready", exact: true }).evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const hit = document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        return {
          ready: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
          viewport: { width: innerWidth, height: innerHeight },
          uncovered: element === hit || element.contains(hit),
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      expect(measurements.overflow).toBe(false);
      expect(measurements.uncovered).toBe(true);
      expect(measurements.ready.height).toBeGreaterThanOrEqual(44);
      expect(measurements.ready.y + measurements.ready.height).toBeLessThanOrEqual(1001);
      await writeFile(
        `${evidence}/layout-${width}-${dark ? "dark" : "light"}.json`,
        JSON.stringify(measurements, null, 2),
      );
      if (width < 960) {
        await page.getByRole("button", { name: "Close deck panel", exact: true }).click();
      }
      await page.getByRole("button", { name: "Cancel / forfeit series", exact: true }).click();
      await expect.poll(async () => (await getView(page, code)).status).toBe("cancelled");
      const cancelled = await getView(page, code);
      const winnerSeat = selected.seat === 0 ? 1 : 0;
      expect(cancelled.status).toBe("cancelled");
      expect(cancelled.reason).toBe("player_cancelled");
      expect(cancelled.players).toEqual(selected.players);
      expect(cancelled.players).toHaveLength(2);
      expect(cancelled.winner).toBe(winnerSeat);
      const winnerName = cancelled.players[winnerSeat];
      expect(winnerName).toBeTruthy();
      await expect(page.getByRole("status").filter({ hasText: /^Series cancelled/ })).toHaveText(
        `Series cancelled · Winner: ${winnerName}`,
      );
      await expect(page.getByRole("status").filter({ hasText: /^Series cancelled/ })).toBeVisible();
    });
  }
}
test("two independent guests build, play, sideboard and finish BO3 from the real lobby", async ({ browser }) => {
  test.setTimeout(240000);
  const startedAt = Date.now();
  const recordVideo = process.env.AEGIS_RECORD_SEALED === "true" ? { dir: `${evidence}/recordings` } : undefined;
  const hostContext = await browser.newContext({ recordVideo });
  const guestContext = await browser.newContext({ recordVideo });
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
  await host.clock.install({ time: Date.now() - 1000 });
  await guest.clock.install({ time: Date.now() - 1000 });
  const errors: string[] = [];
  for (const page of [host, guest]) {
    page.on("pageerror", (error) => errors.push(error.message));
  }
  try {
    await host.goto("/play", { waitUntil: "domcontentloaded" });
    await selectPrivateSealedFormat({ page: host });
    await expect(host.getByRole("textbox", { name: "Player name", exact: true })).toHaveCount(0);
    await host.getByRole("combobox", { name: "Booster series", exact: true }).selectOption("EX13");
    await host.getByRole("button", { name: "Create", exact: true }).click();
    const code = await host.getByTestId("private-sealed-code").innerText();
    const beforeAdmission = await getView(host, code);
    expect(beforeAdmission.players).toHaveLength(1);
    expect(beforeAdmission.pool.packs).toEqual([]);
    await expect(host.getByText(/waiting for the second player/i)).toBeVisible();
    await expect(host.getByRole("heading", { name: "Your pool & deck", exact: true })).toHaveCount(0);
    await guest.goto(`/play?privateSealed=${code}`, { waitUntil: "domcontentloaded" });
    await expect(guest.getByRole("textbox", { name: "Player name", exact: true })).toHaveCount(0);
    await guest.getByRole("button", { name: "Join", exact: true }).click();
    await expect(guest.getByRole("heading", { name: "Your pool & deck", exact: true })).toBeVisible();
    const own = await getView(host, code);
    expect(own.players).toHaveLength(2);
    expect(own.pool.configuration).toEqual(beforeAdmission.pool.configuration);
    await host.goto(`/play?privateSealed=${code}&setId=BT26`, { waitUntil: "domcontentloaded" });
    await expect(host.getByRole("heading", { name: "Your pool & deck", exact: true })).toBeVisible();
    expect((await getView(host, code)).pool.packs).toEqual(own.pool.packs);
    expect((await getView(host, code)).pool.configuration).toEqual(own.pool.configuration);
    await expect(host.getByRole("combobox", { name: "Booster series" })).toHaveCount(0);
    const other = await getView(guest, code);
    expect(own.seat).toBe(0);
    expect(other.seat).toBe(1);
    expect(own.pool.configuration.setId).toBe("EX13");
    expect(other.pool.configuration).toEqual(own.pool.configuration);
    await expect(guest.getByRole("combobox", { name: "Booster series" })).toHaveCount(0);
    expect(own.pool.packs.flat()).toHaveLength(72);
    expect(other.pool.packs.flat()).toHaveLength(72);
    const cookie = (await hostContext.cookies()).find((entry) => entry.name === "aegis_private_sealed")!;
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe("Strict");
    expect(await host.evaluate(() => document.cookie)).not.toContain(cookie.value);
    for (const page of [host, guest]) {
      await expect(page.locator("[data-pool-card]")).toHaveCount(0);
      await expect(page.locator(".deck-builder-page")).toHaveCount(0);
      await pausePackOpeningAnimations({ page });
      await page.getByRole("button", { name: "Open packs", exact: true }).click();
      await expect(page.getByRole("combobox", { name: "Booster set", exact: true })).toHaveValue("EX13");
      await waitForPackOpeningScene({ page });
      await expect(page.locator(".pack-opening canvas")).toBeVisible();
      const soloBefore = await page.evaluate(() => localStorage.getItem("aegis:booster-progress:v2"));
      await togglePackOpeningCheckbox({ page, name: "Skip animations" });
      await activatePackOpeningButton({ page, name: "Open all packs (6)" });
      await expect(page.getByRole("heading", { name: "All cards (72)", exact: true })).toBeVisible();
      const allocation = page === host ? own : other;
      expect(
        await page.locator(".pack-result-card").evaluateAll((elements) =>
          elements.map((element) => ({
            cardId: (element as HTMLElement).dataset.cardId,
            artId: (element as HTMLElement).dataset.artId,
          })),
        ),
      ).toEqual(
        allocation.pool.packs.flat().map((card) => ({ cardId: card.cardId, artId: card.artId ?? card.cardId })),
      );
      expect(await page.evaluate(() => localStorage.getItem("aegis:booster-progress:v2"))).toBe(soloBefore);
      await activatePackOpeningButton({ page, name: "Back to deck building" });
      await expect(page.locator(".pack-opening-page")).toHaveCount(0);
      await page.clock.resume();
    }
    await Promise.all([buildDeck(host, own), buildDeck(guest, other)]);
    console.log("Private sealed: both initial decks locked through the real lobby");
    for (let game = 1; game <= 2; game++) {
      await host.getByRole("button", { name: "Start next game", exact: true }).click();
      await expect(guest.getByRole("button", { name: "Enter / reconnect to game", exact: true })).toBeVisible();
      await guest.getByRole("button", { name: "Enter / reconnect to game", exact: true }).click();
      await expect
        .poll(() =>
          [...backend.rooms.values()].some(
            (room) =>
              !room.state.gameOver &&
              room.state.players.length === 2 &&
              room.state.rulesPolicy === "sealed-v1" &&
              room.state.players.every((player) => player.hand.length === 5),
          ),
        )
        .toBe(true);
      for (let mulligan = 0; mulligan < 2; mulligan++) {
        const room = [...backend.rooms.values()].find(
          (entry) => !entry.state.gameOver && entry.state.players.length === 2,
        )!;
        await expect.poll(() => room.state.pendingDecision?.kind).toBe("mulligan");
        const player = room.state.pendingDecision!.seat === 0 ? host : guest;
        const decisionId = room.state.pendingDecision!.decisionId;
        await player.getByRole("button", { name: "Keep hand", exact: true }).click();
        await expect.poll(() => room.state.pendingDecision?.decisionId).not.toBe(decisionId);
      }
      await expect
        .poll(() => [...backend.rooms.values()].some((room) => !room.state.gameOver && room.state.turnCount >= 1))
        .toBe(true);
      if (game === 1) {
        const room = [...backend.rooms.values()].find(
          (entry) => !entry.state.gameOver && entry.state.players.length === 2,
        )!;
        const matchId = room.state.matchLogId;
        await host.reload({ waitUntil: "domcontentloaded" });
        await expect(host.getByRole("button", { name: "Enter / reconnect to game", exact: true })).toBeVisible();
        await host.getByRole("button", { name: "Enter / reconnect to game", exact: true }).click();
        await expect(host.getByRole("group", { name: "Your battle area", exact: true })).toBeVisible();
        expect(room.state.matchLogId).toBe(matchId);
        expect((await getView(host, code)).pool.packs).toEqual(own.pool.packs);
      }
      console.log(`Private sealed: game ${game} began after both mulligans`);
      const current = [...backend.rooms.values()].find(
        (entry) => !entry.state.gameOver && entry.state.players.length === 2,
      )!;
      const stored = (await backend.pool.query("SELECT state FROM private_sealed_series WHERE code=$1", [code])).rows[0]
        .state;
      expect(Reflect.get(current, "initialDeckBySeat").get(0).mainDeckArts).toEqual(
        stored.games.at(-1).decks[0].mainDeckArts,
      );
      const turn = current.state.turnCount;
      const active = current.state.turnSeat === 0 ? host : guest;
      if (current.state.phase === Phase.Breeding) {
        await active.getByRole("button", { name: "End breeding", exact: true }).click();
      }
      await expect.poll(() => current.state.phase).toBe(Phase.Main);
      await active.getByRole("button", { name: "End turn", exact: true }).click();
      await active
        .getByRole("dialog", { name: "End turn?", exact: true })
        .getByRole("button", { name: "End turn", exact: true })
        .click();
      await expect.poll(() => current.state.turnCount).toBeGreaterThan(turn);
      console.log(`Private sealed: game ${game} advanced a real turn through native controls`);
      await expect(host.getByRole("button", { name: "Surrender", exact: true })).toBeVisible();
      await guest.getByRole("button", { name: "Surrender", exact: true }).click();
      const confirmation = guest.getByRole("dialog", { name: "Surrender this match?", exact: true });
      await confirmation.getByRole("button", { name: "Surrender", exact: true }).click();
      await expect.poll(async () => (await getView(host, code)).score).toEqual([game, 0]);
      console.log(`Private sealed: authoritative score ${game}–0`);
      await expect(host.getByRole("dialog", { name: "Victory", exact: true })).toBeVisible();
      await host.screenshot({ path: `${evidence}/game-${game}-victory.png`, fullPage: true });
      if (game === 2) {
        await Promise.all(
          [host, guest].map((page) => page.getByRole("button", { name: "Main menu", exact: true }).click()),
        );
      } else {
        await Promise.all([
          host.reload({ waitUntil: "domcontentloaded" }),
          guest.reload({ waitUntil: "domcontentloaded" }),
        ]);
      }
      if (game === 1) {
        await expect(host.getByRole("heading", { name: "Your pool & deck", exact: true })).toBeVisible();
        const side = await getView(host, code);
        expect(side.pool.packs).toEqual(own.pool.packs);
        expect(side.pool.configuration).toEqual(own.pool.configuration);
        const cards = side.pool.packs.flat();
        const printings = [...new Set(cards.map((card) => card.artId ?? card.cardId))];
        const main = side.pool.deck!.mainDeck;
        const remove = printings.findIndex((printing) => main.includes(printing));
        const add = printings.findIndex(
          (printing) =>
            printing !== printings[remove] &&
            !getCardDefinition(cards.find((card) => (card.artId ?? card.cardId) === printing)!.cardId)!.kinds.includes(
              CardKind.DigiEgg,
            ) &&
            main.filter((card) => card === printing).length <
              cards.filter((card) => (card.artId ?? card.cardId) === printing).length,
        );
        expect(add).toBeGreaterThanOrEqual(0);
        const removeId = cards.find((card) => (card.artId ?? card.cardId) === printings[remove])!.cardId;
        const addId = cards.find((card) => (card.artId ?? card.cardId) === printings[add])!.cardId;
        await host
          .locator(`[data-pool-card="${removeId}"]`)
          .getByRole("button", { name: "Remove", exact: true })
          .click();
        await host.locator(`[data-pool-card="${addId}"]`).getByRole("button", { name: "Add", exact: true }).click();
        await host.screenshot({ path: `${evidence}/sideboard-exchange.png`, fullPage: true });
        await Promise.all(
          [host, guest].map((page) => page.getByRole("button", { name: "Ready", exact: true }).click()),
        );
        await expect(host.getByRole("status", { name: "Ready · deck locked", exact: true })).toBeVisible();
        console.log("Private sealed: same pools, a real sideboard exchange and both revision-two decks locked");
      }
    }
    await expect(host.getByText(`Series complete · Winner: ${own.players[0]}`, { exact: true })).toBeVisible();
    await host.screenshot({ path: `${evidence}/series-complete.png`, fullPage: true });
    expect((await getView(host, code)).pool.packs).toEqual(own.pool.packs);
    expect((await backend.pool.query("SELECT count(*) FROM tournaments")).rows[0].count).toBe("0");
    const persisted = (await backend.pool.query("SELECT state FROM private_sealed_series WHERE code=$1", [code]))
      .rows[0].state;
    expect(persisted.configuration).toEqual(own.pool.configuration);
    expect(persisted.games).toHaveLength(2);
    expect(persisted.games[0].decks[0]).not.toEqual(persisted.games[1].decks[0]);
    expect(persisted.games[0].revisions).toEqual([1, 1]);
    expect(persisted.games[1].revisions).toEqual([2, 2]);
    expect(errors).toEqual([]);
    await writeFile(
      `${evidence}/private-bo3-result.json`,
      JSON.stringify(
        {
          schema: (await backend.pool.query("SELECT current_schema() AS schema")).rows[0].schema,
          configuration: persisted.configuration,
          guestPools: [own, other].map((view) => ({
            packs: view.pool.packs.length,
            pulls: view.pool.packs.flat().length,
          })),
          games: [0, 1].map((index) => ({
            revisions: persisted.games[index].revisions,
            decks: persisted.games[index].decks,
          })),
          score: (await getView(host, code)).score,
          poolConserved: true,
          changedSideboard: true,
          errors,
        },
        null,
        2,
      ),
    );
    console.log(
      `Private sealed: final UI, persistence, pool and error assertions passed in ${Date.now() - startedAt}ms`,
    );
  } finally {
    await Promise.all([hostContext.close(), guestContext.close()]);
    console.log(`Private sealed: recorded contexts closed in ${Date.now() - startedAt}ms`);
    await Promise.all([
      host.video()?.saveAs(`${evidence}/recordings/private-host.webm`),
      guest.video()?.saveAs(`${evidence}/recordings/private-guest.webm`),
    ]);
  }
});
