import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { CardKind, Phase } from "@aegis/shared/schema/enums";
import { getCardDefinition } from "@aegis/shared/cards/registry";
import { getSealedConfiguration } from "@aegis/shared/sealed/getSealedConfiguration";
import type { SealedOwnPool } from "@aegis/shared/sealed/SealedContracts";
import { startSealedSwissBrowserServer } from "../../api/test-support/startSealedSwissBrowserServer";
import { pausePackOpeningAnimations } from "./pausePackOpeningAnimations";
import { waitForPackOpeningScene } from "./waitForPackOpeningScene";
import { togglePackOpeningCheckbox } from "./togglePackOpeningCheckbox";
import { activatePackOpeningButton } from "./activatePackOpeningButton";

let backend: Awaited<ReturnType<typeof startSealedSwissBrowserServer>>;

test.beforeAll(async () => {
  backend = await startSealedSwissBrowserServer({
    connectionString: process.env.SEALED_TEST_DATABASE_URL,
    port: Number(process.env.AEGIS_E2E_EDGE_PORT ?? 2569),
  });
});
test.afterAll(async () => {
  await backend?.close();
});

test("four signed-in players keep their pools through two played Swiss BO3 rounds", async ({ browser }) => {
  test.setTimeout(480_000);
  const accounts = await Promise.all(
    Array.from({ length: 4 }, (_, index) =>
      backend.accounts.accountForIdentity("discord", randomUUID(), `Swiss Tamer ${index + 1}`),
    ),
  );
  const event = await backend.accounts.createTournament(accounts[0]!.id, {
    name: "Two round sealed acceptance",
    block: "BT4",
    startsAt: Date.now(),
    maxPlayers: 8,
    structure: "swiss",
    bestOf: 3,
    sealedConfiguration: getSealedConfiguration({ setId: "EX13" }),
  });
  const contexts = await Promise.all(
    accounts.map(() =>
      browser.newContext({ locale: "en-US", reducedMotion: "reduce", viewport: { width: 1440, height: 1000 } }),
    ),
  );
  const pages = await Promise.all(contexts.map((context) => context.newPage()));
  const errors: string[] = [];
  const pools = new Map<string, SealedOwnPool>();
  const route = `/tournaments/${event.id}`;
  const getPool = async (accountId: string) =>
    (await backend.sealed.getOwnPool({ tournamentId: event.id, accountId }))!;
  try {
    for (const [index, page] of pages.entries()) {
      page.on("pageerror", (error) => errors.push(error.message));
      await page.clock.install({ time: Date.now() - 1000 });
      const session = await backend.accounts.issueSession(accounts[index]!);
      await contexts[index]!.addCookies([{ name: "aegis_session", value: session.id, domain: "127.0.0.1", path: "/" }]);
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: "Sign up", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Review and confirm", exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Confirm sign-up", exact: true }).click();
      await page.getByRole("button", { name: "Check in", exact: true }).click();
      await expect
        .poll(async () =>
          Number(
            (
              await backend.pool.query(
                "SELECT count(*) FROM tournament_participants WHERE tournament_id=$1 AND status='checked_in'",
                [event.id],
              )
            ).rows[0].count,
          ),
        )
        .toBe(index + 1);
      await page.goto("about:blank");
    }
    await pages[0]!.goto(route, { waitUntil: "domcontentloaded" });
    await pages[0]!.getByRole("link", { name: "Organize", exact: true }).click();
    await pages[0]!.getByRole("button", { name: "Close check-in", exact: true }).click();
    await pages[0]!.getByRole("button", { name: "Close check-in and start", exact: true }).click();
    await expect.poll(async () => (await getPool(accounts[0]!.id))?.packs.length).toBe(6);
    for (const [index, page] of pages.entries()) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      const own = await getPool(accounts[index]!.id);
      pools.set(accounts[index]!.id, own);
      expect(own.packs.flat()).toHaveLength(72);
      await revealPool({ page });
      await page.goto("about:blank");
    }
    await Promise.all(pages.map((page) => page.goto(route, { waitUntil: "domcontentloaded" })));
    await Promise.all(pages.map((page, index) => buildDeck({ page, pool: pools.get(accounts[index]!.id)! })));
    for (const page of pages) {
      await page.getByRole("button", { name: "Ready", exact: true }).click();
    }
    await expect.poll(async () => (await backend.accounts.tournament(event.id))!.status).toBe("in_progress");
    const pairings: string[][] = [];
    for (const round of [1, 2]) {
      const matches = (
        await backend.pool.query<{ id: string; player0_account_id: string; player1_account_id: string }>(
          "SELECT id,player0_account_id,player1_account_id FROM tournament_matches WHERE tournament_id=$1 AND round=$2 ORDER BY position",
          [event.id, round],
        )
      ).rows;
      expect(matches).toHaveLength(2);
      pairings.push(matches.map((match) => [match.player0_account_id, match.player1_account_id].sort().join(":")));
      await Promise.all(
        matches.map(async (match) => {
          const ids = [match.player0_account_id, match.player1_account_id];
          const players = ids.map((id) => pages[accounts.findIndex((account) => account.id === id)]!);
          for (const page of players) {
            await page.goto(route, { waitUntil: "domcontentloaded" });
            await expect(page.locator(".tournaments-my-match__table")).toContainText(`Round ${round}`);
            await page
              .locator(".tournaments-match-actions")
              .getByRole("button", { name: "Ready", exact: true })
              .click();
          }
          await expect.poll(async () => (await backend.series.seriesForMatch(match.id))?.status).toBe("playing");
          const series = (await backend.series.seriesForMatch(match.id))!;
          for (const game of [1, 2]) {
            if (round > 1 || game > 1) {
              for (const [seat, page] of players.entries()) {
                const own = await getPool(ids[seat]!);
                expect(own.packs).toEqual(pools.get(ids[seat]!)!.packs);
                expect(own.editable).toBe(true);
                expect(own.window).not.toBeNull();
                if (seat === 0) {
                  await exchangeCard({ page, pool: own });
                }
                await page.getByRole("button", { name: "Ready", exact: true }).click();
                await expect.poll(async () => (await getPool(ids[seat]!)).ready).toBe(true);
              }
            }
            for (const page of players) {
              await page.getByRole("button", { name: "Enter game", exact: true }).click();
            }
            await expect
              .poll(async () => {
                const roomId = (await backend.series.seriesForMatch(match.id))!.games.find(
                  (entry) => entry.gameIndex === game,
                )?.roomId;
                return roomId ? backend.rooms.has(roomId) : false;
              })
              .toBe(true);
            const roomId = (await backend.series.seriesForMatch(match.id))!.games.find(
              (entry) => entry.gameIndex === game,
            )!.roomId!;
            const room = backend.rooms.get(roomId)!;
            expect(room.state.rulesPolicy).toBe("sealed-v1");
            await expect.poll(() => room.clients.length).toBe(2);
            const seatedPlayers = [0, 1].map((seat) => {
              const accountIndex = accounts.findIndex(
                (account) => account.displayName === room.state.players[seat]!.displayName,
              );
              expect(accountIndex).toBeGreaterThanOrEqual(0);
              return pages[accountIndex]!;
            });
            expect(new Set(seatedPlayers)).toEqual(new Set(players));
            for (let mulligan = 0; mulligan < 2; mulligan++) {
              await expect.poll(() => room.state.pendingDecision?.kind).toBe("mulligan");
              const { seat, decisionId } = room.state.pendingDecision!;
              await seatedPlayers[seat]!.getByRole("button", { name: "Keep hand", exact: true }).click();
              await expect.poll(() => room.state.pendingDecision?.decisionId).not.toBe(decisionId);
            }
            await expect.poll(() => room.state.turnCount).toBeGreaterThan(0);
            const turn = room.state.turnCount;
            const active = seatedPlayers[room.state.turnSeat]!;
            if (room.state.phase === Phase.Breeding) {
              await active.getByRole("button", { name: "End breeding", exact: true }).click();
            }
            await expect.poll(() => room.state.phase).toBe(Phase.Main);
            await active.getByRole("button", { name: "End turn", exact: true }).click();
            await active
              .getByRole("dialog", { name: "End turn?", exact: true })
              .getByRole("button", { name: "End turn", exact: true })
              .click();
            await expect.poll(() => room.state.turnCount).toBeGreaterThan(turn);
            await players[1]!.getByRole("button", { name: "Surrender", exact: true }).click();
            await players[1]!
              .getByRole("dialog", { name: "Surrender this match?", exact: true })
              .getByRole("button", { name: "Surrender", exact: true })
              .click();
            await expect.poll(async () => (await backend.series.seriesForMatch(match.id))!.wins).toEqual([game, 0]);
            await expect(players[0]!.getByRole("dialog", { name: "Victory", exact: true })).toBeVisible();
            for (const page of players) {
              await page.getByRole("button", { name: "Main menu", exact: true }).click();
            }
            console.log(
              `Swiss round ${round}, table ${matches.indexOf(match) + 1}, game ${game}: real turn and result`,
            );
          }
          expect((await backend.series.seriesForMatch(match.id))!.status).toBe("resolved");
          expect((await backend.series.seriesForMatch(match.id))!.games).toHaveLength(2);
          const snapshots = (await backend.series.seriesForMatch(match.id))!.games;
          expect(snapshots[0]!.deckSnapshots[0]!.mainDeckArts).not.toEqual(
            snapshots[1]!.deckSnapshots[0]!.mainDeckArts,
          );
          for (const game of snapshots) {
            expect(game.deckSnapshots.every((deck) => deck?.mainDeck.length === 40)).toBe(true);
          }
          expect(series.winsRequired).toBe(2);
        }),
      );
    }
    expect(pairings[0]!.every((pair) => !pairings[1]!.includes(pair))).toBe(true);
    await expect.poll(async () => (await backend.accounts.tournament(event.id))!.status).toBe("in_progress");
    await expect
      .poll(async () =>
        Number(
          (
            await backend.pool.query("SELECT count(*) FROM tournament_matches WHERE tournament_id=$1 AND round=3", [
              event.id,
            ])
          ).rows[0].count,
        ),
      )
      .toBe(2);
    await Promise.all(
      pages.map(async (page, index) => {
        const own = await getPool(accounts[index]!.id);
        expect(own.packs).toEqual(pools.get(accounts[index]!.id)!.packs);
        expect(own.editable).toBe(true);
        expect(own.window).not.toBeNull();
        await page.reload({ waitUntil: "domcontentloaded" });
        await expect(page.locator(".tournaments-detail__title-row")).toContainText("In progress");
      }),
    );
    expect(errors).toEqual([]);
    const evidence = process.env.AEGIS_SEALED_EVIDENCE_DIR ?? "test-results/sealed/swiss";
    await mkdir(evidence, { recursive: true });
    await writeFile(
      `${evidence}/two-round-swiss.json`,
      JSON.stringify({ pairings, games: 8, poolsConserved: 4, errors }),
    );
  } finally {
    for (const context of contexts) {
      await context.close();
    }
  }
});

type PoolParams = { page: Page; pool: SealedOwnPool };

async function revealPool({ page }: { page: Page }) {
  await expect(page.getByRole("heading", { name: "Your pool & deck", exact: true })).toBeVisible();
  await expect(page.locator("[data-pool-card]")).toHaveCount(0);
  await pausePackOpeningAnimations({ page });
  await page.getByRole("button", { name: "Open packs", exact: true }).click();
  await waitForPackOpeningScene({ page });
  await togglePackOpeningCheckbox({ page, name: "Skip animations" });
  await activatePackOpeningButton({ page, name: "Open all packs (6)" });
  await expect(page.locator(".pack-result-card")).toHaveCount(72);
  await activatePackOpeningButton({ page, name: "Back to deck building" });
  await page.clock.resume();
}

async function buildDeck({ page, pool }: PoolParams) {
  const selected = pool.packs
    .flat()
    .filter((card) => !getCardDefinition(card.cardId)!.kinds.includes(CardKind.DigiEgg))
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
  await expect(page.getByRole("button", { name: "Ready", exact: true })).toBeEnabled();
}

async function exchangeCard({ page, pool }: PoolParams) {
  const main = pool.deck!.mainDeck;
  const pulls = pool.packs.flat();
  const removed = pulls.find((card) => main.includes(card.artId ?? card.cardId))!;
  const added = pulls.find(
    (card) =>
      card.cardId !== removed.cardId &&
      !getCardDefinition(card.cardId)!.kinds.includes(CardKind.DigiEgg) &&
      main.filter((printing) => printing === (card.artId ?? card.cardId)).length <
        pulls.filter((pull) => (pull.artId ?? pull.cardId) === (card.artId ?? card.cardId)).length,
  )!;
  expect(added).toBeDefined();
  for (const [cardId, action] of [
    [removed.cardId, "Remove"],
    [added.cardId, "Add"],
  ]) {
    const card = page.locator(`[data-pool-card="${cardId}"]`);
    if ((await card.count()) === 0) {
      await page.locator(".deck-card-pool").evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
    }
    await card.getByRole("button", { name: action, exact: true }).click();
  }
}
