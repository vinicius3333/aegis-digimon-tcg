import { afterAll, beforeAll, expect, it } from "vitest";
import { Client, type Room } from "@colyseus/sdk";
import { matchMaker } from "colyseus";
import { GameState, ROOM_TYPE, ROOM_TYPE_PRIVATE, EVENT_CHANNEL, type SequencedServerEvent } from "@aegis/shared";
import type { AegisRoom } from "@aegis-api/rooms/AegisRoom.js";
import { RED_DECK } from "@aegis-api/engine/testDecks.js";
import { startTestServer, type TestServer } from "./scenarioHarness/server";

let server: TestServer;
const connections: Room[] = [];
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await Promise.all(
    connections.filter((room) => room.connection.isOpen).map((room) => room.leave().catch(() => undefined)),
  );
  await server.close();
});
const options = (displayName: string) => ({ displayName, deck: RED_DECK });
async function waitFor(check: () => boolean): Promise<void> {
  const deadline = Date.now() + 5000;
  while (!check()) {
    if (Date.now() > deadline) throw new Error("Timed out waiting for spectator state");
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}
async function observer(roomId: string, roomCode?: string) {
  const [listing] = await matchMaker.query({ roomId });
  const reservation = await matchMaker.reserveSeatFor(listing!, { ...options("Observer"), spectator: true, roomCode });
  const room = await new Client(server.endpoint).consumeSeatReservation<GameState>(reservation, GameState);
  room.onMessage(EVENT_CHANNEL, () => {});
  connections.push(room);
  await waitFor(() => room.state?.players.length === 2);
  return room;
}

for (const privateRoom of [false, true]) {
  it(`observes a started ${privateRoom ? "private" : "public"} match without becoming a player`, async () => {
    const first = await new Client(server.endpoint).create<GameState>(
      privateRoom ? ROOM_TYPE_PRIVATE : ROOM_TYPE,
      options("Alpha"),
      GameState,
    );
    connections.push(first);
    first.onMessage(EVENT_CHANNEL, () => {});
    first.onMessage("decision", () => {});
    await waitFor(() => first.state?.players.length === 1);
    const code = first.state.spectatorCode;
    const second = await new Client(server.endpoint).joinById<GameState>(
      first.roomId,
      { ...options("Beta"), roomCode: privateRoom ? code : undefined },
      GameState,
    );
    connections.push(second);
    second.onMessage(EVENT_CHANNEL, () => {});
    second.onMessage("decision", () => {});
    first.send("ready", {});
    second.send("ready", {});
    await waitFor(() => first.state.players[0]!.handCount > 0);
    const [listing] = await matchMaker.query({ roomId: first.roomId });
    expect(listing!.locked).toBe(true);
    {
      expect(await matchMaker.remoteRoomCall<AegisRoom, "spectatorInfo">(first.roomId, "spectatorInfo", [])).toBeNull();
      await expect(observer(first.roomId, "WRONG1")).rejects.toThrow(/auth|not available/i);
    }
    const watched = await observer(first.roomId, code);
    expect(watched.state.players.map((player) => player.sessionId)).toEqual([first.sessionId, second.sessionId]);
    expect(first.state.players[0]!.hand.length).toBeGreaterThan(0);
    for (const player of watched.state.players) {
      expect(player.hand.length).toBe(0);
      expect(player.deck.length).toBe(0);
      expect(player.eggDeck.length).toBe(0);
      expect(player.security.length).toBe(0);
      expect(player.handCount).toBeGreaterThan(0);
      expect(player.securityCount).toBe(first.state.players[player.seat]!.securityCount);
    }
    expect(watched.state.pendingDecision?.payloadJson ?? "").toBe("");
    watched.send("surrender", {});
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(first.state.gameOver).toBe(false);
    const token = watched.reconnectionToken;
    watched.connection.close(4500, "spectator connection lost");
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(first.state.players.every((player) => player.connected)).toBe(true);
    const resumed = await new Client(server.endpoint).reconnect<GameState>(token, GameState);
    resumed.onMessage(EVENT_CHANNEL, () => {});
    connections.push(resumed);
    await waitFor(() => resumed.state?.players.length === 2);
    expect(resumed.state.players.every((player) => player.hand.length === 0)).toBe(true);
    await resumed.leave();
    expect(first.state.gameOver).toBe(false);
    const finalObserver = await observer(first.roomId, code);
    const events: SequencedServerEvent[] = [];
    finalObserver.onMessage<SequencedServerEvent>(EVENT_CHANNEL, (event) => events.push(event));
    second.send("surrender", {});
    await waitFor(() => finalObserver.state.gameOver);
    expect(events.some((event) => event.kind === "gameOver")).toBe(true);
    expect(finalObserver.state.winnerSeat).toBe(0);
    expect(
      await matchMaker.remoteRoomCall<AegisRoom, "spectatorInfo">(first.roomId, "spectatorInfo", [code]),
    ).toBeNull();
    await Promise.all([first, second, finalObserver].map((room) => room.leave()));
  }, 20_000);
}

it("keeps a burst of three player reservations in two separate matches", async () => {
  const first = await matchMaker.joinOrCreate(ROOM_TYPE, options("Reservation A"));
  const second = await matchMaker.joinOrCreate(ROOM_TYPE, options("Reservation B"));
  const third = await matchMaker.joinOrCreate(ROOM_TYPE, options("Reservation C"));
  expect(second.roomId).toBe(first.roomId);
  expect(third.roomId).not.toBe(first.roomId);
  const joined = await Promise.all(
    [first, second, third].map(async (reservation) => {
      const room = await new Client(server.endpoint).consumeSeatReservation<GameState>(reservation, GameState);
      room.onMessage(EVENT_CHANNEL, () => {});
      connections.push(room);
      return room;
    }),
  );
  await Promise.all(joined.map((room) => room.leave()));
}, 20_000);
