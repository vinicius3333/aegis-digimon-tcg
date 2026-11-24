import { ArbitrationService } from "#api/tournaments/arbitration/ArbitrationService";
import { EliminationStore } from "#api/tournaments/elimination/EliminationStore";
import { settle } from "#api/engine/testkit/harness";
import type { Intent } from "@aegis/shared/protocol/intents";
import { AegisRoom, type AegisJoinOptions } from "#api/rooms/AegisRoom";
import type { Client } from "colyseus";
import { addLogSink } from "#api/logger";
import { extractReplay } from "#api/replays/inputs/extract";
import { runReplay } from "#api/replays/inputs/run";
import { GameRulesPolicy } from "@aegis/shared/sealed/GameRulesPolicy";
import express from "express";
import type { AddressInfo } from "node:net";
import { installAccountRoutes } from "#api/accounts/routes";
import { sweepSealedPreparation } from "#api/tournaments/sealed/sweepSealedPreparation";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AccountStore } from "#api/accounts/AccountStore";
import { ParticipantStore } from "#api/tournaments/participants/ParticipantStore";
import { SeriesStore } from "#api/tournaments/series/SeriesStore";
import { SwissProgram } from "#api/tournaments/swiss/SwissProgram";
import { SealedStore } from "#api/tournaments/sealed/SealedStore";
import { getSealedConfiguration } from "@aegis/shared/sealed/getSealedConfiguration";
import { CardKind } from "@aegis/shared/schema/enums";
import { getCardDefinition } from "@aegis/shared/cards/registry";

const schema = `sealed_${randomUUID().replaceAll("-", "")}`;
const connectionString = process.env.SEALED_TEST_DATABASE_URL;
if (!connectionString?.startsWith("postgres://postgres@127.0.0.1:55439/")) {
  throw new Error("Sealed SQL tests require the isolated local database on port 55439");
}
const admin = new Pool({ connectionString });
const pool = new Pool({ connectionString, options: `-c search_path=${schema}` });
const accounts = new AccountStore(pool);
const participants = new ParticipantStore(accounts);
const series = new SeriesStore(accounts);
const swiss = new SwissProgram(accounts, series);
const sealed = new SealedStore(accounts);
const now = 1_000_000;

beforeAll(async () => {
  await admin.query(`CREATE SCHEMA ${schema}`);
  await accounts.ensureReady();
});
afterAll(async () => {
  await pool.end();
  await admin.query(`DROP SCHEMA ${schema} CASCADE`);
  await admin.end();
});

async function buildEvent(count = 4, setId = "BT4") {
  const players = await Promise.all(
    Array.from({ length: count }, async (_, index) =>
      accounts.accountForIdentity("discord", randomUUID(), `Player ${index}`),
    ),
  );
  const event = await accounts.createTournament(players[0]!.id, {
    name: "Sealed Swiss",
    block: "BT4",
    startsAt: now,
    maxPlayers: 8,
    structure: "swiss",
    bestOf: 3,
    sealedConfiguration: getSealedConfiguration({ setId }),
  });
  for (const player of players) {
    expect((await participants.register({ tournamentId: event.id, accountId: player.id, now })).ok).toBe(true);
    expect((await participants.checkIn({ tournamentId: event.id, accountId: player.id, now })).ok).toBe(true);
  }
  expect((await participants.closeCheckIn({ tournamentId: event.id, now })).ok).toBe(true);
  return { event, players };
}

function chooseDeck(own: NonNullable<Awaited<ReturnType<SealedStore["getOwnPool"]>>>) {
  const pulls = own.packs.flat();
  return {
    mainDeck: pulls
      .filter((pull) => !getCardDefinition(pull.cardId)!.kinds.includes(CardKind.DigiEgg))
      .slice(0, 40)
      .map((pull) => pull.artId ?? pull.cardId),
    eggDeck: pulls
      .filter((pull) => getCardDefinition(pull.cardId)!.kinds.includes(CardKind.DigiEgg))
      .slice(0, 5)
      .map((pull) => pull.artId ?? pull.cardId),
    revision: own.revision,
    window: own.window!,
  };
}

describe("sealed check-in and Swiss readiness", () => {
  it("preserves allocated pools when an organizer tries to delete preparation", async () => {
    const { event, players } = await buildEvent(2);
    expect(await accounts.deleteTournament(event.id, players[0]!.id)).toBe("already_started");
    expect(await sealed.getOwnPool({ tournamentId: event.id, accountId: players[0]!.id, now })).not.toBeNull();
  });
  it("allocates one durable private pool and blocks Swiss until every initial deck is ready", async () => {
    const { event, players } = await buildEvent();
    expect(await swiss.startTournamentProgram(event.id, now)).toMatchObject({ ok: false, reason: "sealed_not_ready" });
    const owner = { tournamentId: event.id, accountId: players[0]!.id, now };
    const own = (await sealed.getOwnPool(owner))!;
    expect(own.packs).toHaveLength(6);
    expect(own.packs.flat()).toHaveLength(72);
    await Promise.all([
      participants.closeCheckIn({ tournamentId: event.id, now }),
      participants.closeCheckIn({ tournamentId: event.id, now }),
    ]);
    expect((await new SealedStore(new AccountStore(pool)).getOwnPool(owner))!.packs).toEqual(own.packs);
    expect(await sealed.getOwnPool({ ...owner, accountId: randomUUID() })).toBeNull();
    const input = { ...owner, ...chooseDeck(own) };
    const submitted = await Promise.all([sealed.ready(input), sealed.ready(input)]);
    expect(submitted.every((result) => result.ok)).toBe(true);
    expect((await sealed.getOwnPool(owner))!.revision).toBe(1);
    expect(await sealed.ready({ ...input, mainDeck: [...input.mainDeck].reverse() })).toMatchObject({
      ok: false,
      reason: "stale_revision",
    });
    for (const player of players.slice(1)) {
      const params = { tournamentId: event.id, accountId: player.id, now };
      expect((await sealed.ready({ ...params, ...chooseDeck((await sealed.getOwnPool(params))!) })).ok).toBe(true);
    }
    expect((await swiss.startTournamentProgram(event.id, now)).ok).toBe(true);
    expect((await swiss.phaseViews(event.id))[0]!.rounds.length).toBe(1);
    expect((await sealed.getOwnPool(owner))!.editable).toBe(false);
    expect(await sealed.ready({ ...input, revision: 1 })).toMatchObject({ ok: false, reason: "sealed_window_closed" });
  });
});

async function readyField(eventId: string, players: { id: string }[], at = now) {
  for (const player of players) {
    const params = { tournamentId: eventId, accountId: player.id, now: at };
    expect((await sealed.ready({ ...params, ...chooseDeck((await sealed.getOwnPool(params))!) })).ok).toBe(true);
  }
  expect((await swiss.startTournamentProgram(eventId, at)).ok).toBe(true);
}

async function startMatch(eventId: string, matchId: string, accountIds: string[], at: number) {
  for (const accountId of accountIds) {
    expect(
      (
        await series.markPresent({
          tournamentId: eventId,
          matchId,
          accountId,
          winsRequired: 2,
          seriesDurationMs: 2_700_000,
          now: at,
        })
      ).ok,
    ).toBe(true);
  }
  return (await series.seriesForMatch(matchId))!;
}

async function playGame(seriesId: string, accountsInMatch: string[], at: number) {
  const authorization = await series.authorizeNextGame({ seriesId, accountId: accountsInMatch[0]!, now: at });
  expect(authorization.ok).toBe(true);
  if (!authorization.ok) {
    throw new Error(authorization.reason);
  }
  const roomId = randomUUID();
  for (const accountId of accountsInMatch) {
    const token =
      accountId === accountsInMatch[0]
        ? authorization
        : await series.authorizeNextGame({ seriesId, accountId, now: at });
    if (!token.ok) {
      throw new Error(token.reason);
    }
    const claim = { gameId: token.value.gameId, authorizationToken: token.value.token, roomId, now: at };
    const claimed = await series.claimGame(claim);
    expect(claimed.ok).toBe(true);
    const reconnected = await new SeriesStore(new AccountStore(pool)).claimGame({ ...claim, now: at + 1 });
    if (!claimed.ok || !reconnected.ok) {
      throw new Error("Sealed game claim and reconnect must both succeed");
    }
    expect(reconnected.value.deck).toEqual(claimed.value.deck);
    expect(reconnected.value.accountId).toBe(claimed.value.accountId);
    expect(reconnected.value.binding.seat).toBe(claimed.value.binding.seat);
    expect(reconnected.value.binding.replaying).toBe(true);
  }
  expect(await series.markGamePlaying(authorization.value.gameId, roomId)).toBe(true);
  const result = {
    gameId: authorization.value.gameId,
    roomId,
    outcome: { kind: "winner" as const, winnerAccountId: accountsInMatch[0]! },
    finishedAt: at + 1000,
  };
  expect((await series.recordGameResult(result)).ok).toBe(true);
  expect((await series.recordGameResult(result)).ok).toBe(true);
  return authorization.value.gameId;
}

it("locks BO3 revisions atomically, retains immutable game snapshots and keeps the original series clock", async () => {
  const { event, players } = await buildEvent(2);
  await readyField(event.id, players);
  const match = (
    await pool.query<{ id: string; player0_account_id: string; player1_account_id: string }>(
      "SELECT id,player0_account_id,player1_account_id FROM tournament_matches WHERE tournament_id=$1",
      [event.id],
    )
  ).rows[0]!;
  const ids = [match.player0_account_id, match.player1_account_id];
  const started = await startMatch(event.id, match.id, ids, now);
  const first = await playGame(started.id, ids, now);
  const snapshot = structuredClone((await series.series(started.id))!.games[0]!.deckSnapshots);
  expect(await series.authorizeNextGame({ seriesId: started.id, accountId: ids[0]!, now: now + 2000 })).toMatchObject({
    ok: false,
    reason: "sealed_sideboarding",
  });
  const readinessChecks: Awaited<ReturnType<SeriesStore["authorizeNextGame"]>>[] = [];
  for (const accountId of ids) {
    const owner = { tournamentId: event.id, accountId, now: now + 2000 };
    const own = (await sealed.getOwnPool(owner))!;
    const submission = {
      ...owner,
      ...chooseDeck(own),
      mainDeck: own.packs
        .flat()
        .filter((pull) => !getCardDefinition(pull.cardId)!.kinds.includes(CardKind.DigiEgg))
        .slice(-40)
        .map((pull) => pull.artId ?? pull.cardId),
      window: own.window!,
    };
    expect((await sealed.ready(submission)).ok).toBe(true);
    if (accountId === ids[0]) {
      readinessChecks.push(await series.authorizeNextGame({ seriesId: started.id, accountId, now: now + 2000 }));
    }
  }
  expect(readinessChecks).toEqual([{ ok: false, reason: "sealed_sideboarding" }]);
  const second = await playGame(started.id, ids, now + 3000);
  expect(second).not.toBe(first);
  const finished = (await series.series(started.id))!;
  expect(finished.seriesDeadlineAt).toBe(started.seriesDeadlineAt);
  expect(finished.games[0]!.deckSnapshots).toEqual(snapshot);
  expect(finished.games[1]!.deckSnapshots.map((deck) => deck!.revision)).toEqual([2, 2]);
  expect(finished.wins).toEqual([2, 0]);
});

it("runs four players through all Swiss rounds with no pool reroll and no duplicate scoring", async () => {
  const { event, players } = await buildEvent();
  await readyField(event.id, players);
  const before = await Promise.all(
    players.map((player) => sealed.getOwnPool({ tournamentId: event.id, accountId: player.id, now })),
  );
  for (let round = 1; round <= 3; round += 1) {
    const matches = (
      await pool.query<{ id: string; player0_account_id: string; player1_account_id: string }>(
        "SELECT id,player0_account_id,player1_account_id FROM tournament_matches WHERE tournament_id=$1 AND round=$2 AND player1_account_id IS NOT NULL",
        [event.id, round],
      )
    ).rows;
    expect(matches).toHaveLength(2);
    for (const match of matches) {
      const ids = [match.player0_account_id, match.player1_account_id];
      const at = now + round * 300_000;
      const confrontation = await startMatch(event.id, match.id, ids, at);
      await playGame(confrontation.id, ids, at);
      await playGame(confrontation.id, ids, at + 122_000);
    }
    const roundId = (
      await pool.query<{ id: string }>(
        "SELECT r.id FROM tournament_rounds r JOIN tournament_phases p ON p.id=r.phase_id WHERE p.tournament_id=$1 AND r.number=$2",
        [event.id, round],
      )
    ).rows[0]!.id;
    expect((await swiss.closeRoundIfComplete(roundId, now + round * 300_000 + 125_000)).ok).toBe(true);
    expect((await swiss.closeRoundIfComplete(roundId, now + round * 300_000 + 125_000)).ok).toBe(true);
  }
  expect((await accounts.tournament(event.id))!.status).toBe("finished");
  expect(await swiss.ledger(event.id)).toHaveLength(12);
  expect(await swiss.standings(event.id)).toHaveLength(4);
  const after = await Promise.all(
    players.map((player) => sealed.getOwnPool({ tournamentId: event.id, accountId: player.id, now })),
  );
  expect(after.map((own) => own!.packs)).toEqual(before.map((own) => own!.packs));
});

it("keeps allocated pools after a drop and handles an odd-field bye without creating games", async () => {
  const { event, players } = await buildEvent(3);
  await readyField(event.id, players);
  expect((await swiss.ledger(event.id)).filter((entry) => entry.outcome === "bye")).toHaveLength(1);
  const entrant = players[0]!;
  const owner = { tournamentId: event.id, accountId: entrant.id, now };
  const before = (await sealed.getOwnPool(owner))!.packs;
  expect((await participants.drop(owner)).ok).toBe(true);
  expect((await sealed.getOwnPool(owner))!.packs).toEqual(before);
  expect((await sealed.getOwnPool(owner))!.editable).toBe(false);
  expect(await participants.register(owner)).toMatchObject({ ok: false, reason: "registration_closed" });
  expect(
    (
      await pool.query(
        "SELECT g.id FROM tournament_games g JOIN match_series s ON s.id=g.series_id JOIN tournament_matches m ON m.id=s.tournament_match_id WHERE m.tournament_id=$1",
        [event.id],
      )
    ).rowCount,
  ).toBe(0);
});

it("drops unready entrants on the durable build deadline and never creates a replacement deck", async () => {
  const { event, players } = await buildEvent(3);
  for (const player of players.slice(0, 2)) {
    const owner = { tournamentId: event.id, accountId: player.id, now };
    expect((await sealed.ready({ ...owner, ...chooseDeck((await sealed.getOwnPool(owner))!) })).ok).toBe(true);
  }
  await sweepSealedPreparation({ accounts, swiss, now: now + 1_800_000 });
  const roster = await participants.participants(event.id);
  expect(roster.find((player) => player.accountId === players[2]!.id)).toMatchObject({
    status: "dropped",
    deckSnapshot: null,
  });
  expect((await accounts.tournament(event.id))!.status).toBe("in_progress");
});

it("serializes sideboard ready with authorization and refuses midgame changes", async () => {
  const { event, players } = await buildEvent(2);
  await readyField(event.id, players);
  const match = (
    await pool.query<{ id: string; player0_account_id: string; player1_account_id: string }>(
      "SELECT id,player0_account_id,player1_account_id FROM tournament_matches WHERE tournament_id=$1",
      [event.id],
    )
  ).rows[0]!;
  const ids = [match.player0_account_id, match.player1_account_id];
  const started = await startMatch(event.id, match.id, ids, now);
  await playGame(started.id, ids, now);
  const firstOwner = { tournamentId: event.id, accountId: ids[0]!, now: now + 2000 };
  const secondOwner = { ...firstOwner, accountId: ids[1]! };
  const own0 = (await sealed.getOwnPool(firstOwner))!;
  const own1 = (await sealed.getOwnPool(secondOwner))!;
  expect((await sealed.ready({ ...firstOwner, ...chooseDeck(own0) })).ok).toBe(true);
  const results = await Promise.all([
    new SealedStore(new AccountStore(pool)).ready({ ...secondOwner, ...chooseDeck(own1) }),
    series.authorizeNextGame({ seriesId: started.id, accountId: ids[0]!, now: now + 2000 }),
  ]);
  expect(results[0]!.ok).toBe(true);
  const authorization = results[1]!.ok
    ? results[1]!
    : await series.authorizeNextGame({ seriesId: started.id, accountId: ids[0]!, now: now + 2001 });
  expect(authorization.ok).toBe(true);
  expect(await sealed.ready({ ...secondOwner, ...chooseDeck(own1), revision: own1.revision + 1 })).toMatchObject({
    ok: false,
    reason: "sealed_window_closed",
  });
  expect((await series.series(started.id))!.games[1]!.deckSnapshots.map((deck) => deck!.revision)).toEqual([2, 2]);
});

it("authenticates private pool APIs and registers a sealed entrant through the real HTTP route without a saved deck", async () => {
  const app = express();
  app.use(express.json());
  installAccountRoutes(app, accounts);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const owner = await accounts.accountForIdentity("discord", randomUUID(), "HTTP Owner");
    const outsider = await accounts.accountForIdentity("discord", randomUUID(), "HTTP Outsider");
    const session = await accounts.issueSession(owner);
    const headers = { Cookie: `aegis_session=${session.id}`, "Content-Type": "application/json" };
    const creation = {
      name: "HTTP Sealed",
      startsAt: Date.now(),
      maxPlayers: 8,
      structure: "swiss",
      bestOf: 3,
      sealedConfiguration: getSealedConfiguration({ setId: "BT4" }),
    };
    const unsupported = await fetch(`${base}/tournaments`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...creation, sealedConfiguration: { ...creation.sealedConfiguration, setId: "BT27" } }),
    });
    expect(unsupported.status).toBe(400);
    const invalidFormat = await fetch(`${base}/tournaments`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...creation, bestOf: 1 }),
    });
    expect(invalidFormat.status).toBe(400);
    const { bestOf: _bestOf, ...defaultCreation } = creation;
    const created = await fetch(`${base}/tournaments`, {
      method: "POST",
      headers,
      body: JSON.stringify(defaultCreation),
    });
    expect(created.status).toBe(201);
    const event = (await created.json()) as { id: string; block: string; bestOf: number };
    expect(event.bestOf).toBe(3);
    expect(event.block).toBe("BT4");
    expect(
      (await fetch(`${base}/tournaments/${event.id}/participants`, { method: "POST", headers, body: "{}" })).status,
    ).toBe(201);
    await participants.checkIn({ tournamentId: event.id, accountId: owner.id });
    await participants.closeCheckIn({ tournamentId: event.id });
    const path = `${base}/tournaments/${event.id}/sealed`;
    expect((await fetch(path)).status).toBe(401);
    const otherSession = await accounts.issueSession(outsider);
    expect((await fetch(path, { headers: { Cookie: `aegis_session=${otherSession.id}` } })).status).toBe(404);
    const response = await fetch(`${path}?accountId=${outsider.id}`, { headers });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    const own = (await response.json()) as NonNullable<Awaited<ReturnType<SealedStore["getOwnPool"]>>>;
    expect(own.packs.flat()).toHaveLength(72);
    const publicDetail = JSON.stringify(await (await fetch(`${base}/tournaments/${event.id}`)).json());
    expect(publicDetail).not.toContain('"packs":[');
    expect(publicDetail).not.toContain('"mainDeck"');
    const rejected = await fetch(`${path}/ready`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...chooseDeck(own), mainDeck: Array<string>(40).fill("fabricated") }),
    });
    expect(rejected.status).toBe(409);
    expect((await sealed.getOwnPool({ tournamentId: event.id, accountId: owner.id }))!.revision).toBe(0);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

it("seats only the game-locked sealed deck in a real room and reproduces its policy and deck from replay logs", async () => {
  const { event, players } = await buildEvent(2);
  await readyField(event.id, players);
  const match = (
    await pool.query<{ id: string; player0_account_id: string; player1_account_id: string }>(
      "SELECT id,player0_account_id,player1_account_id FROM tournament_matches WHERE tournament_id=$1",
      [event.id],
    )
  ).rows[0]!;
  const ids = [match.player0_account_id, match.player1_account_id];
  const started = await startMatch(event.id, match.id, ids, Date.now());
  const authorizations = [];
  for (const accountId of ids) {
    const result = await series.authorizeNextGame({ seriesId: started.id, accountId });
    if (!result.ok) {
      throw new Error(result.reason);
    }
    authorizations.push(result.value);
  }
  class TestRoom extends AegisRoom {
    protected override accounts() {
      return accounts;
    }
    protected override series() {
      return series;
    }
  }
  const room = new TestRoom();
  const lines: string[] = [];
  const stop = addLogSink((line) => lines.push(line));
  room.roomId = randomUUID();
  room.lock = async () => {};
  room.unlock = async () => {};
  room.setMatchmaking = async () => {};
  room.broadcast = () => true;
  try {
    await room.onCreate({ tournamentRoom: true, tournamentGameId: authorizations[0]!.gameId, seed: 42 });
    expect(room.state.rulesPolicy).toBe(GameRulesPolicy.SEALED.value);
    for (const [seat, token] of authorizations.entries()) {
      const client = { sessionId: `sealed-${seat}`, send: () => {} } as unknown as Client;
      const options: AegisJoinOptions = {
        displayName: "Untrusted",
        deck: { mainDeck: Array<string>(40).fill("fabricated"), eggDeck: [] },
        tournamentGameId: token.gameId,
        tournamentGameToken: token.token,
      };
      expect(await room.onAuth(client, options)).toBe(true);
      room.clients.push(client);
      room.onJoin(client, options);
      expect(options.deck.mainDeck).not.toContain("fabricated");
      expect(options.deck.mainDeck).toHaveLength(40);
    }
    const driver = room as unknown as { handleIntent(client: Client, intent: Intent): void };
    for (const client of room.clients) {
      driver.handleIntent(client, { type: "ready" });
    }
    await settle(() => room.state.players.every((player) => player.hand.length === 5));
    const openingHands = room.state.players.map((player) => Array.from(player.hand, (card) => card.cardId));
    for (const player of room.state.players) {
      expect(player.hand.length + player.deck.length + player.security.length).toBe(40);
    }
    const record = extractReplay(lines, room.state.matchLogId);
    expect(record.rules.rulesPolicy).toBe(GameRulesPolicy.SEALED.value);
    expect(record.seats.map((seat) => seat.deck.mainDeck.length)).toEqual([40, 40]);
    expect(JSON.stringify(record)).not.toContain('"packs"');
    const replay = await runReplay(JSON.parse(JSON.stringify(record)));
    expect(replay.divergences).toEqual([]);
    expect(replay.state.players.map((player) => Array.from(player.hand, (card) => card.cardId))).toEqual(openingHands);
    expect(replay.state.rulesPolicy).toBe(GameRulesPolicy.SEALED.value);
    expect(replay.engine.stagedDecks.map((deck) => deck!.mainDeck)).toEqual(
      record.seats.map((seat) => seat.deck.mainDeck),
    );
  } finally {
    stop();
    room.onDispose();
    room.clock.stop();
  }
});

it("finishes an odd-field Swiss event after a paired entrant drops without rerolling or double-awarding the bye", async () => {
  const { event, players } = await buildEvent(3);
  await readyField(event.id, players);
  const firstMatch = (
    await pool.query<{ id: string; player0_account_id: string }>(
      "SELECT id,player0_account_id FROM tournament_matches WHERE tournament_id=$1 AND round=1 AND player1_account_id IS NOT NULL",
      [event.id],
    )
  ).rows[0]!;
  const droppedOwner = { tournamentId: event.id, accountId: firstMatch.player0_account_id, now: now + 1 };
  const original = (await sealed.getOwnPool(droppedOwner))!.packs;
  const arbitration = new ArbitrationService(accounts, participants, series, swiss, new EliminationStore(accounts));
  expect((await arbitration.dropParticipant(droppedOwner)).ok).toBe(true);
  for (const round of [2, 3]) {
    const matches = (
      await pool.query<{ id: string; player0_account_id: string; player1_account_id: string }>(
        "SELECT id,player0_account_id,player1_account_id FROM tournament_matches WHERE tournament_id=$1 AND round=$2 AND player1_account_id IS NOT NULL",
        [event.id, round],
      )
    ).rows;
    expect(matches).toHaveLength(1);
    const match = matches[0]!;
    const ids = [match.player0_account_id, match.player1_account_id];
    const at = now + round * 300_000;
    const confrontation = await startMatch(event.id, match.id, ids, at);
    await playGame(confrontation.id, ids, at);
    await playGame(confrontation.id, ids, at + 122_000);
    const roundId = (
      await pool.query<{ id: string }>(
        "SELECT r.id FROM tournament_rounds r JOIN tournament_phases p ON p.id=r.phase_id WHERE p.tournament_id=$1 AND r.number=$2",
        [event.id, round],
      )
    ).rows[0]!.id;
    expect((await swiss.closeRoundIfComplete(roundId, at + 125_000)).ok).toBe(true);
  }
  const ledger = await swiss.ledger(event.id);
  expect(ledger.filter((entry) => entry.outcome === "bye")).toHaveLength(1);
  expect(ledger).toHaveLength(7);
  expect((await accounts.tournament(event.id))!.status).toBe("finished");
  expect((await accounts.tournament(event.id))!.winnerAccountId).not.toBe(droppedOwner.accountId);
  expect((await sealed.getOwnPool(droppedOwner))!.packs).toEqual(original);
});

it("keeps durable between-match preparation across round publication and locks the next first-game revisions", async () => {
  const { event, players } = await buildEvent(4);
  await readyField(event.id, players);
  const firstMatches = (
    await pool.query<{ id: string; player0_account_id: string; player1_account_id: string; round_id: string }>(
      "SELECT id,player0_account_id,player1_account_id,round_id FROM tournament_matches WHERE tournament_id=$1 AND round=1",
      [event.id],
    )
  ).rows;
  for (const match of firstMatches) {
    const ids = [match.player0_account_id, match.player1_account_id];
    const confrontation = await startMatch(event.id, match.id, ids, now);
    await playGame(confrontation.id, ids, now);
    await playGame(confrontation.id, ids, now + 122000);
  }
  const owner = { tournamentId: event.id, accountId: players[0]!.id, now: now + 123001 };
  const preparation = (await sealed.getOwnPool(owner))!;
  expect(preparation.editable).toBe(true);
  expect(preparation.window).toMatch(/^match:/);
  await swiss.closeRoundIfComplete(firstMatches[0]!.round_id, now + 124000);
  const next = (
    await pool.query<{ id: string; player0_account_id: string; player1_account_id: string }>(
      "SELECT id,player0_account_id,player1_account_id FROM tournament_matches WHERE tournament_id=$1 AND round=2 AND (player0_account_id=$2 OR player1_account_id=$2)",
      [event.id, owner.accountId],
    )
  ).rows[0]!;
  const ids = [next.player0_account_id, next.player1_account_id];
  const confrontation = await startMatch(event.id, next.id, ids, now + 124001);
  expect(
    await series.authorizeNextGame({ seriesId: confrontation.id, accountId: ids[0]!, now: now + 124002 }),
  ).toMatchObject({ ok: false, reason: "sealed_sideboarding" });
  const restored = (await new SealedStore(new AccountStore(pool)).getOwnPool({ ...owner, now: now + 124003 }))!;
  expect(restored.window).toBe(preparation.window);
  expect(restored.deadlineAt).toBe(preparation.deadlineAt);
  for (const accountId of ids) {
    const input = { ...owner, accountId, now: now + 124004 };
    const own = (await sealed.getOwnPool(input))!;
    expect((await sealed.ready({ ...input, ...chooseDeck(own), mainDeck: [...own.deck!.mainDeck].reverse() })).ok).toBe(
      true,
    );
  }
  const authorized = await series.authorizeNextGame({
    seriesId: confrontation.id,
    accountId: ids[0]!,
    now: now + 124005,
  });
  expect(authorized.ok).toBe(true);
  expect((await series.series(confrontation.id))!.games[0]!.deckSnapshots.map((deck) => deck!.revision)).toEqual([
    2, 2,
  ]);
  expect((await sealed.getOwnPool({ ...owner, now: now + 124006 }))!.editable).toBe(false);
  expect((await sealed.getOwnPool(owner))!.packs).toEqual(preparation.packs);
});

it("opens a bounded durable preparation window after a bye", async () => {
  const { event, players } = await buildEvent(3);
  await readyField(event.id, players);
  const bye = (
    await pool.query<{ id: string; player0_account_id: string }>(
      "SELECT id,player0_account_id FROM tournament_matches WHERE tournament_id=$1 AND status='bye'",
      [event.id],
    )
  ).rows[0]!;
  const owner = { tournamentId: event.id, accountId: bye.player0_account_id, now: now + 1 };
  const own = (await sealed.getOwnPool(owner))!;
  expect(own).toMatchObject({ window: `match:${bye.id}`, editable: true, deadlineAt: now + 120000 });
  expect((await new SealedStore(new AccountStore(pool)).getOwnPool(owner))!.window).toBe(own.window);
  expect((await sealed.ready({ ...owner, ...chooseDeck(own) })).ok).toBe(true);
  const first = (
    await pool.query<{ id: string; player0_account_id: string; player1_account_id: string; round_id: string }>(
      "SELECT id,player0_account_id,player1_account_id,round_id FROM tournament_matches WHERE tournament_id=$1 AND round=1 AND player1_account_id IS NOT NULL",
      [event.id],
    )
  ).rows[0]!;
  const firstIds = [first.player0_account_id, first.player1_account_id];
  const played = await startMatch(event.id, first.id, firstIds, now);
  await playGame(played.id, firstIds, now);
  await playGame(played.id, firstIds, now + 122000);
  await swiss.closeRoundIfComplete(first.round_id, now + 124000);
  const next = (
    await pool.query<{ id: string; player0_account_id: string; player1_account_id: string }>(
      "SELECT id,player0_account_id,player1_account_id FROM tournament_matches WHERE tournament_id=$1 AND round=2 AND (player0_account_id=$2 OR player1_account_id=$2)",
      [event.id, owner.accountId],
    )
  ).rows[0]!;
  const ids = [next.player0_account_id, next.player1_account_id];
  const other = ids.find((accountId) => accountId !== owner.accountId)!;
  const otherOwner = { ...owner, accountId: other, now: now + 124001 };
  expect((await sealed.ready({ ...otherOwner, ...chooseDeck((await sealed.getOwnPool(otherOwner))!) })).ok).toBe(true);
  const confrontation = await startMatch(event.id, next.id, ids, now + 124002);
  expect(
    (await series.authorizeNextGame({ seriesId: confrontation.id, accountId: owner.accountId, now: now + 124003 })).ok,
  ).toBe(true);
  expect((await series.series(confrontation.id))!.games[0]!.deckSnapshots.map((deck) => deck!.revision)).toEqual([
    2, 2,
  ]);
  expect((await sealed.getOwnPool({ ...owner, now: now + 124004 }))!.editable).toBe(false);
});

it("enforces sealed BO3 at the persistence boundary and defaults omitted BO3 consistently", async () => {
  const owner = await accounts.accountForIdentity("discord", randomUUID(), "BO3 organizer");
  const input = {
    name: "Sealed configuration",
    block: "BT4",
    startsAt: now,
    maxPlayers: 8,
    structure: "swiss" as const,
    sealedConfiguration: getSealedConfiguration({ setId: "BT4" }),
  };
  await expect(accounts.createTournament(owner.id, { ...input, bestOf: 1 })).rejects.toThrow(
    "sealed_configuration_invalid",
  );
  expect((await accounts.createTournament(owner.id, input)).bestOf).toBe(3);
});

it("sweeps beyond twenty pending preparations without starving later ready or expired events", async () => {
  const earlier = [];
  for (let index = 0; index < 20; index += 1) {
    earlier.push(await buildEvent(2));
  }
  const laterReady = await buildEvent(2);
  const laterExpired = await buildEvent(2);
  for (const player of laterReady.players) {
    const input = { tournamentId: laterReady.event.id, accountId: player.id, now };
    const own = (await sealed.getOwnPool(input))!;
    expect((await sealed.ready({ ...input, ...chooseDeck(own) })).ok).toBe(true);
  }
  await pool.query("UPDATE tournaments SET sealed_build_deadline_at=$1 WHERE id=ANY($2::uuid[])", [
    now + 2000000,
    [laterReady.event.id, laterExpired.event.id],
  ]);
  await sweepSealedPreparation({ accounts, swiss, now });
  expect((await accounts.tournament(laterReady.event.id))!.status).toBe("in_progress");
  await sweepSealedPreparation({ accounts, swiss, now: now + 2000001 });
  expect((await accounts.tournament(laterExpired.event.id))!.status).toBe("cancelled");
  for (const event of earlier) {
    expect((await accounts.tournament(event.event.id))!.status).toBe("cancelled");
  }
}, 60000);

it("sanitizes sealed organizer start responses even when all decks are ready", async () => {
  const { event, players } = await buildEvent(2);
  for (const player of players) {
    const owner = { tournamentId: event.id, accountId: player.id };
    const own = (await sealed.getOwnPool({ ...owner, now }))!;
    expect((await sealed.ready({ ...owner, ...chooseDeck(own), now })).ok).toBe(true);
  }
  await pool.query("UPDATE tournaments SET sealed_build_deadline_at=$1 WHERE id=$2", [Date.now() + 60000, event.id]);
  const app = express();
  app.use(express.json());
  installAccountRoutes(app, accounts);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  try {
    const session = await accounts.issueSession(players[0]!);
    const result = await fetch(
      `http://127.0.0.1:${(server.address() as AddressInfo).port}/tournaments/${event.id}/start`,
      {
        method: "POST",
        headers: { Cookie: `aegis_session=${session.id}`, "Content-Type": "application/json" },
        body: "{}",
      },
    );
    expect(result.status).toBe(200);
    const body = JSON.stringify(await result.json());
    expect(body).not.toContain("deckSnapshot");
    expect(body).not.toContain("mainDeck");
    expect(body).not.toContain("packs");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

it.each(["EX13", "BT26"])("allocates the selected %s product durably to every Swiss entrant", async (setId) => {
  const { event, players } = await buildEvent(2, setId);
  const config = getSealedConfiguration({ setId });
  for (const player of players) {
    const owner = { tournamentId: event.id, accountId: player.id, now };
    const own = (await sealed.getOwnPool(owner))!;
    expect(own.configuration).toEqual(config);
    expect(own.packs.map((pack) => pack.length)).toEqual([12, 12, 12, 12, 12, 12]);
    expect(own.packs.flat().every((pull) => pull.cardId.startsWith(`${setId}-`))).toBe(true);
    expect((await new SealedStore(new AccountStore(pool)).getOwnPool(owner))!.packs).toEqual(own.packs);
  }
  await readyField(event.id, players);
  expect((await accounts.tournament(event.id))!.sealedConfiguration).toEqual(config);
});
