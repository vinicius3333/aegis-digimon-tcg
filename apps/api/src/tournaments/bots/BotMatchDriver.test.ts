import { randomUUID } from "node:crypto";
import { Encoder } from "@colyseus/schema";
import type { Client } from "colyseus";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountStore } from "../../accounts/AccountStore.js";
import { createMemoryPool } from "../../db/memoryPool.fixture.js";
import { BLUE_DECK, RED_DECK } from "../../engine/testDecks.js";
import { AegisRoom, type AegisJoinOptions } from "../../rooms/AegisRoom.js";
import { inProcessTournamentLock } from "../participants/index.js";
import { SeriesStore } from "../series/index.js";
import { BotMatchDriver, type BotRoomGateway, type BotSeatableRoom } from "./BotMatchDriver.js";
import "../../cards/index.js";

/**
 * The bot driver against REAL rooms.
 *
 * Nothing here is a stand-in for the room: `AegisRoom` is instantiated directly and driven through
 * its lifecycle hooks, exactly as `AegisRoom.tournament.test.ts` does, with a real `GameEngine`, a
 * real `BotPlayer` and a real `SeriesStore` over pg-mem. The only substitutions are the ones a test
 * has to make — the think delay becomes a yield, and the gateway builds rooms without a matchmaker.
 */

let accounts: AccountStore;
let series: SeriesStore;
let driver: BotMatchDriver;
let tournamentId: string;
let matchId: string;
let rooms: TestRoom[];

class TestRoom extends AegisRoom {
  protected override series(): SeriesStore {
    return series;
  }

  protected override accounts(): AccountStore {
    return accounts;
  }
}

function makeRoom(roomId: string): TestRoom {
  const room = new TestRoom();
  room.broadcast = vi.fn<() => boolean>(() => true) as AegisRoom["broadcast"];
  (room as unknown as { roomId: string }).roomId = roomId;
  room.onCreate({ seed: 7, botRoom: false, tournamentRoom: true });
  // Production attaches the state to an Encoder before anybody joins; keeping that lifecycle here
  // means a detached schema node fails the test rather than passing it.
  // eslint-disable-next-line no-new -- constructing the Encoder wires the state root
  new Encoder(room.state);
  return room;
}

/** Hands back the room already bound to a game, or makes one. Mirrors the Colyseus gateway. */
function testGateway(): BotRoomGateway {
  const byGame = new Map<string, TestRoom>();
  return {
    async roomForGame({ gameId }): Promise<BotSeatableRoom | undefined> {
      const bound = (
        await accounts.pool.query<{ room_id: string | null }>("SELECT room_id FROM tournament_games WHERE id=$1", [
          gameId,
        ])
      ).rows[0];
      if (bound?.room_id) {
        const existing = rooms.find((room) => room.roomId === bound.room_id);
        if (existing) return existing;
      }
      const made = byGame.get(gameId) ?? makeRoom(`room-${rooms.length}`);
      byGame.set(gameId, made);
      if (!rooms.includes(made)) rooms.push(made);
      return made;
    },
  };
}

const DECKS = [RED_DECK, BLUE_DECK];

async function addBot(name: string, deckIndex: number): Promise<string> {
  const id = randomUUID();
  const deck = DECKS[deckIndex]!;
  await accounts.pool.query(
    `INSERT INTO tournament_participants (id, tournament_id, kind, account_id, display_name, status, deck_snapshot, created_at, bot_profile, bot_deck_version)
     VALUES ($1,$2,'bot',NULL,$3,'active',$4,$5,$6,'meta@1')`,
    [
      id,
      tournamentId,
      name,
      JSON.stringify({ deckId: "bot", name, mainDeck: [...deck.mainDeck], eggDeck: [...deck.eggDeck], revision: 1 }),
      Date.now(),
      deckIndex === 0 ? "aggressive" : "defensive",
    ],
  );
  return id;
}

async function addHuman(name: string, deckIndex: number): Promise<{ participantId: string; accountId: string }> {
  const account = await accounts.accountForIdentity("discord", name, name);
  const id = randomUUID();
  const deck = DECKS[deckIndex]!;
  await accounts.pool.query(
    `INSERT INTO tournament_participants (id, tournament_id, kind, account_id, display_name, status, deck_snapshot, created_at)
     VALUES ($1,$2,'human',$3,$4,'active',$5,$6)`,
    [
      id,
      tournamentId,
      account.id,
      name,
      JSON.stringify({ deckId: "human", name, mainDeck: [...deck.mainDeck], eggDeck: [...deck.eggDeck], revision: 1 }),
      Date.now(),
    ],
  );
  return { participantId: id, accountId: account.id };
}

async function seatMatch(
  seat0: { participantId: string; accountId?: string },
  seat1: { participantId: string; accountId?: string },
): Promise<void> {
  await accounts.pool.query(
    `INSERT INTO tournament_matches
       (id, tournament_id, round, position, status, player0_participant_id, player0_account_id, player1_participant_id, player1_account_id)
     VALUES ($1,$2,1,0,'pending',$3,$4,$5,$6)`,
    [matchId, tournamentId, seat0.participantId, seat0.accountId ?? null, seat1.participantId, seat1.accountId ?? null],
  );
}

function fakeClient(sessionId: string): Client {
  return { sessionId, send: vi.fn<() => void>(), view: undefined } as unknown as Client;
}

beforeEach(async () => {
  accounts = new AccountStore(createMemoryPool());
  series = new SeriesStore(accounts, inProcessTournamentLock());
  rooms = [];
  const organizer = await accounts.accountForIdentity("discord", "organizer", "Organizer");
  const tournament = await accounts.createTournament(organizer.id, {
    name: "Lightning Cup",
    block: "BT10",
    startsAt: 1,
    maxPlayers: 8,
    allowBots: true,
  });
  tournamentId = tournament.id;
  matchId = randomUUID();
  driver = new BotMatchDriver(accounts, series, testGateway(), {
    // A yield instead of a two-second pause: same decisions, no waiting.
    botOptions: { thinkDelay: () => Promise.resolve(), seed: 11 },
    pollIntervalMs: 1,
    maxPolls: 4_000,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  });
});

describe("recognising bot seats", () => {
  it("reports each bot seat with the personality it was seated under", async () => {
    const first = await addBot("Agumon Unit", 0);
    const second = await addBot("Gabumon Unit", 1);
    await seatMatch({ participantId: first }, { participantId: second });
    expect(await driver.botSeats(matchId)).toEqual([
      { seat: 0, participantId: first, profile: "aggressive" },
      { seat: 1, participantId: second, profile: "defensive" },
    ]);
  });

  it("has nothing to drive in a match between two people", async () => {
    const alice = await addHuman("Alice", 0);
    const bob = await addHuman("Bob", 1);
    await seatMatch(alice, bob);
    expect(await driver.botSeats(matchId)).toEqual([]);
    expect(await driver.driveMatch({ tournamentId, matchId, winsRequired: 1, seriesDurationMs: null })).toEqual({
      kind: "no_bot_seat",
    });
  });

  it("waits rather than starting a series on its own when the person has not arrived", async () => {
    const alice = await addHuman("Alice", 0);
    const bot = await addBot("Agumon Unit", 1);
    await seatMatch(alice, { participantId: bot });
    expect(
      await driver.driveMatch({
        tournamentId,
        matchId,
        winsRequired: 1,
        seriesDurationMs: null,
        waitForOpponent: false,
      }),
    ).toEqual({ kind: "waiting_for_opponent" });
    // The bot IS present — it is the confrontation that has not started.
    const presence = await series.presence(matchId);
    expect(presence?.presentAt[1]).not.toBeNull();
    expect(presence?.series).toBeUndefined();
  });
});

describe("bot versus bot, unattended", () => {
  it("plays a whole confrontation through real rooms with nobody connected", async () => {
    const first = await addBot("Agumon Unit", 0);
    const second = await addBot("Gabumon Unit", 1);
    await seatMatch({ participantId: first }, { participantId: second });

    const outcome = await driver.driveMatch({ tournamentId, matchId, winsRequired: 1, seriesDurationMs: null });
    expect(outcome.kind).toBe("resolved");
    if (outcome.kind !== "resolved") return;

    expect(["participant0", "participant1"]).toContain(outcome.series.officialResult);
    expect(outcome.series.wins[0] + outcome.series.wins[1]).toBe(1);
    // The game was really played: a room claimed it, and it finished there.
    const game = outcome.series.games[0]!;
    expect(game.status).toBe("finished");
    expect(game.roomId).toBeTruthy();
    expect(rooms.some((room) => room.roomId === game.roomId)).toBe(true);
    // No client ever connected.
    expect(rooms.every((room) => room.clients.length === 0)).toBe(true);
  }, 60_000);

  it("plays a best-of-three to a decision on one clock", async () => {
    const first = await addBot("Agumon Unit", 0);
    const second = await addBot("Gabumon Unit", 1);
    await seatMatch({ participantId: first }, { participantId: second });

    const outcome = await driver.driveMatch({
      tournamentId,
      matchId,
      winsRequired: 2,
      seriesDurationMs: 3_600_000,
    });
    expect(outcome.kind).toBe("resolved");
    if (outcome.kind !== "resolved") return;
    expect(Math.max(...outcome.series.wins)).toBe(2);
    expect(outcome.series.games.filter((game) => game.status === "finished").length).toBeGreaterThanOrEqual(2);
    // A fresh room per game, but never a fresh clock.
    const roomIds = outcome.series.games.map((game) => game.roomId);
    expect(new Set(roomIds).size).toBe(roomIds.length);
    expect(outcome.series.seriesDeadlineAt).not.toBeNull();
  }, 120_000);
});

describe("human versus bot", () => {
  it("seats the bot opposite a person in the room that person joined", async () => {
    const alice = await addHuman("Alice", 0);
    const bot = await addBot("Agumon Unit", 1);
    await seatMatch(alice, { participantId: bot });

    // The person arrives first, exactly as the ordinary flow has them do.
    const started = await series.markPresent({
      tournamentId,
      matchId,
      accountId: alice.accountId,
      winsRequired: 1,
      seriesDurationMs: null,
    });
    if (!started.ok) throw new Error(started.reason);

    // The bot's own presence starts the confrontation, and the driver then plays its seat.
    const drive = driver.driveMatch({ tournamentId, matchId, winsRequired: 1, seriesDurationMs: null });

    // The person joins the room the bot's authorization bound, through the ordinary join path.
    const room = await waitFor(() => rooms[0]);
    const seriesId = (await series.seriesForMatch(matchId))!.id;
    const issued = await series.authorizeNextGame({ seriesId, accountId: alice.accountId });
    if (!issued.ok) throw new Error(issued.reason);
    const options: AegisJoinOptions = {
      displayName: "ignored",
      deck: { mainDeck: [], eggDeck: [] },
      tournamentGameId: issued.value.gameId,
      tournamentGameToken: issued.value.token,
    };
    const client = fakeClient("session-alice");
    expect(await room.onAuth(client, options)).toBe(true);
    room.clients.push(client);
    room.onJoin(client, options);

    // Both seats are filled, and the match has NOT started: a tournament game waits for the person
    // to be ready, exactly as it would against another person. The bot's readiness alone is not a
    // reason to deal somebody a hand while their client is still loading.
    await waitFor(() => (room.state.players[0] && room.state.players[1] ? true : undefined));
    expect(matchStarted(room)).toBe(false);
    handleIntent(room, client, { type: "ready" });
    await waitFor(() => (matchStarted(room) ? true : undefined));

    // Under way with one client and one bot; the person concedes to end it.
    handleIntent(room, client, { type: "surrender" });

    const outcome = await drive;
    expect(outcome.kind).toBe("resolved");
    if (outcome.kind !== "resolved") return;
    // The bot took the seat the person did not, and won the game the person conceded.
    expect(outcome.series.wins[0] + outcome.series.wins[1]).toBe(1);
    expect(room.clients).toHaveLength(1);
  }, 60_000);

  it("refuses a bot authorization presented over the wire", async () => {
    const alice = await addHuman("Alice", 0);
    const bot = await addBot("Agumon Unit", 1);
    await seatMatch(alice, { participantId: bot });
    for (const holder of [{ accountId: alice.accountId }, { participantId: bot }] as const)
      await series.markPresent({
        tournamentId,
        matchId,
        ...holder,
        winsRequired: 1,
        seriesDurationMs: null,
      });
    const seriesId = (await series.seriesForMatch(matchId))!.id;
    const issued = await series.authorizeNextGame({ seriesId, participantId: bot });
    if (!issued.ok) throw new Error(issued.reason);

    const room = makeRoom("room-wire");
    rooms.push(room);
    expect(
      await room.onAuth(fakeClient("impostor"), {
        displayName: "Impostor",
        deck: { mainDeck: [], eggDeck: [] },
        tournamentGameId: issued.value.gameId,
        tournamentGameToken: issued.value.token,
      }),
    ).toBe(false);
    // The refusal claimed nothing, so the bot's own driver can still use the game.
    expect((await series.series(seriesId))?.games[0]?.roomId ?? null).toBeNull();
  });
});

describe("the HTTP bot route stays shut", () => {
  it("still refuses to seat a bot in a tournament room", () => {
    const room = makeRoom("room-http");
    const client = fakeClient("session-human");
    room.clients.push(client);
    room.onJoin(client, { displayName: "Human", deck: { mainDeck: [], eggDeck: [] } });
    // `POST /bot/join` reaches exactly this method and nothing else.
    expect(room.addBot()).toBe(false);
  });
});

function matchStarted(room: AegisRoom): boolean {
  return (room as unknown as { matchStartRequested: boolean }).matchStartRequested;
}

function handleIntent(room: AegisRoom, client: Client, intent: { type: string }): void {
  (room as unknown as { handleIntent: (client: Client, intent: unknown) => void }).handleIntent(client, intent);
}

async function waitFor<T>(read: () => T | undefined, attempts = 2_000): Promise<T> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const value = read();
    if (value !== undefined) return value;
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  throw new Error("condition never became true");
}
