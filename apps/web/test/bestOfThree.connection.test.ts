// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { Client, type Room } from "@colyseus/sdk";
import {
  DECISION_CHANNEL,
  GameState,
  SERIES_CHANNEL,
  type DecisionRequest,
  type Seat,
  type SeriesSeatMessage,
} from "@aegis/shared";
import { RED_DECK, BLUE_DECK } from "@aegis-api/engine/testDecks.js";
import { startTestServer, type TestServer } from "./scenarioHarness/server";

let server: TestServer | undefined;
const rooms: Room<GameState>[] = [];
afterEach(async () => {
  await Promise.all(rooms.splice(0).map((room) => room.leave().catch(() => undefined)));
  await server?.close();
  server = undefined;
});

interface Player {
  name: string;
  room: Room<GameState>;
  seatToken?: string;
}

function keepEveryHand(room: Room<GameState>) {
  room.onMessage<DecisionRequest>(DECISION_CHANNEL, (request) => {
    if (request.kind === "mulligan") room.send("mulligan", { keep: true });
  });
}

function bind(player: Player, room: Room<GameState>) {
  player.room = room;
  rooms.push(room);
  keepEveryHand(room);
  room.onMessage<SeriesSeatMessage>(SERIES_CHANNEL, (message) => {
    player.seatToken = message.seatToken;
  });
  room.send("ready", {});
}

async function queue(endpoint: string, name: string, bestOf: 1 | 3, deck = RED_DECK): Promise<Player> {
  const room = await new Client(endpoint).joinOrCreate<GameState>(
    "aegis",
    { displayName: name, deck, matchTimer: false, bestOf },
    GameState,
  );
  const player: Player = { name, room };
  bind(player, room);
  return player;
}

function seatOf(player: Player): Seat {
  return player.room.state.players.findIndex((entry) => entry.displayName === player.name) as Seat;
}

async function startedGame(players: Player[]) {
  await vi.waitFor(() => expect(players[0]!.room.state.turnCount).toBeGreaterThan(0), { timeout: 10_000 });
}

/** Ends the running game with `loser` conceding through the real intent. */
async function concede(loser: Player, players: Player[]) {
  await startedGame(players);
  loser.room.send("surrender", {});
  await vi.waitFor(() => expect(loser.room.state.gameOver).toBe(true), { timeout: 5000 });
}

/** The loser picks; then both seats hop to the room the series opened. */
async function nextGame(players: Player[], chooser: Player, goFirst: boolean) {
  await vi.waitFor(() => expect(chooser.room.state.series.phase).toBe("choosing"));
  expect(chooser.room.state.series.chooserSeat).toBe(seatOf(chooser));
  chooser.room.send(SERIES_CHANNEL, { action: "chooseTurnOrder", goFirst });
  await vi.waitFor(() => expect(chooser.room.state.series.nextRoomId).not.toBe(""), { timeout: 5000 });
  const nextRoomId = chooser.room.state.series.nextRoomId;
  for (const player of players) {
    await vi.waitFor(() => expect(player.seatToken).toBeDefined());
    const previous = player.room;
    const next = await new Client(server!.endpoint).joinById<GameState>(
      nextRoomId,
      { displayName: "ignored", deck: BLUE_DECK, seriesToken: player.seatToken },
      GameState,
    );
    await previous.leave();
    rooms.splice(rooms.indexOf(previous), 1);
    bind(player, next);
  }
}

describe("casual best-of-three websocket contract", () => {
  it("keeps Bo1 and Bo3 queues apart", async () => {
    server = await startTestServer();
    const single = await queue(server.endpoint, "Single", 1);
    const series = await queue(server.endpoint, "Series", 3);
    expect(series.room.roomId).not.toBe(single.room.roomId);
    const seriesOpponent = await queue(server.endpoint, "Series opponent", 3);
    expect(seriesOpponent.room.roomId).toBe(series.room.roomId);
    await vi.waitFor(() => expect(series.room.state.series.bestOf).toBe(3));
    expect(single.room.state.series.bestOf).toBe(1);
  }, 15_000);

  it("plays a series to 2-1 across two room hops with the loser choosing turn order", async () => {
    server = await startTestServer();
    const alice = await queue(server.endpoint, "Alice", 3);
    const bob = await queue(server.endpoint, "Bob", 3, BLUE_DECK);
    const players = [alice, bob];
    const aliceSeat = () => seatOf(alice);

    await concede(alice, players);
    await vi.waitFor(() => expect(bob.room.state.series.wins0 + bob.room.state.series.wins1).toBe(1));
    await nextGame(players, alice, false);

    await startedGame(players);
    const game2 = alice.room.state;
    expect(game2.series.gameNumber).toBe(2);
    expect(seatOf(alice)).toBe(aliceSeat());
    expect(game2.players[aliceSeat()]!.displayName).toBe("Alice");
    // Alice chose to go second, so Bob starts game 2.
    expect(game2.turnSeat).toBe(1 - aliceSeat());

    await concede(bob, players);
    await nextGame(players, bob, true);
    await startedGame(players);
    expect(bob.room.state.series.gameNumber).toBe(3);
    expect(bob.room.state.turnSeat).toBe(seatOf(bob));

    await concede(bob, players);
    await vi.waitFor(() => expect(alice.room.state.series.phase).toBe("over"));
    expect(alice.room.state.series.winnerSeat).toBe(aliceSeat());
    expect(alice.room.state.series.endReason).toBe("won");
    expect([...alice.room.state.series.results]).toEqual([1 - aliceSeat(), aliceSeat(), aliceSeat()]);
  }, 60_000);

  it("forfeits the series when a seat leaves between games", async () => {
    server = await startTestServer();
    const alice = await queue(server.endpoint, "Alice", 3);
    const bob = await queue(server.endpoint, "Bob", 3, BLUE_DECK);
    await concede(alice, [alice, bob]);
    await vi.waitFor(() => expect(bob.room.state.series.phase).toBe("choosing"));
    alice.room.send(SERIES_CHANNEL, { action: "leave" });
    await vi.waitFor(() => expect(bob.room.state.series.phase).toBe("over"));
    expect(bob.room.state.series.winnerSeat).toBe(seatOf(bob));
    expect(bob.room.state.series.endReason).toBe("forfeit");
  }, 20_000);

  it("refuses a forged continuation and a joiner without a seat token", async () => {
    server = await startTestServer();
    await expect(
      new Client(server.endpoint).create<GameState>(
        "aegis",
        { displayName: "Forger", deck: RED_DECK, seriesId: "made-up", seriesNonce: "made-up" },
        GameState,
      ),
    ).rejects.toThrow(/cannot continue/i);

    const alice = await queue(server.endpoint, "Alice", 3);
    const bob = await queue(server.endpoint, "Bob", 3, BLUE_DECK);
    await concede(alice, [alice, bob]);
    alice.room.send(SERIES_CHANNEL, { action: "chooseTurnOrder", goFirst: true });
    await vi.waitFor(() => expect(alice.room.state.series.nextRoomId).not.toBe(""), { timeout: 5000 });
    await expect(
      new Client(server.endpoint).joinById<GameState>(
        alice.room.state.series.nextRoomId,
        { displayName: "Intruder", deck: RED_DECK, seriesToken: "guess" },
        GameState,
      ),
    ).rejects.toThrow(/auth/i);
  }, 20_000);
});
