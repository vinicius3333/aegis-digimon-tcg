import { afterAll, beforeAll, expect, it } from "vitest";
import { Client, type Room } from "@colyseus/sdk";
import { ROOM_TYPE } from "@aegis/shared";
import { RED_DECK } from "@aegis-api/engine/testDecks.js";
import { startTestServer, type TestServer } from "./scenarioHarness/server";

// Discord general chat: queueing failed with "Connection lost: BJ61mlVIC is already full".
// A full room left unlocked stays in matchmaking, and every queued join fails on its seats.

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.close();
});

const queue = (displayName: string) =>
  new Client(server.endpoint).joinOrCreate(ROOM_TYPE, {
    displayName,
    deck: { mainDeck: RED_DECK.mainDeck, eggDeck: RED_DECK.eggDeck },
  });

const settle = () => new Promise((resolve) => setTimeout(resolve, 300));

async function leaveAll(rooms: Room[]) {
  await Promise.all(rooms.map((room) => room.leave().catch(() => undefined)));
  await settle();
}

it("keeps a full room out of matchmaking after a player reconnects before the match starts", async () => {
  const first = await queue("Alpha");
  const second = await queue("Beta");
  expect(second.roomId).toBe(first.roomId);

  const token = second.reconnectionToken;
  second.connection.close(4500, "scenario: simulated network drop");
  await settle();
  const reconnected = await new Client(server.endpoint).reconnect(token);
  await settle();

  const third = await queue("Gamma");
  expect(third.roomId).not.toBe(first.roomId);
  await leaveAll([first, reconnected, third]);
}, 30_000);

it("keeps a started match out of matchmaking", async () => {
  const first = await queue("Alpha");
  const second = await queue("Beta");
  first.send("ready", {});
  second.send("ready", {});
  await settle();

  const third = await queue("Gamma");
  expect(third.roomId).not.toBe(first.roomId);
  await leaveAll([first, second, third]);
}, 30_000);

it("reopens a waiting room when the reconnected player's opponent leaves before the match starts", async () => {
  const first = await queue("Alpha");
  const second = await queue("Beta");
  const token = second.reconnectionToken;
  second.connection.close(4500, "scenario: simulated network drop");
  await settle();
  const reconnected = await new Client(server.endpoint).reconnect(token);
  await settle();
  await first.leave();
  await settle();

  const third = await queue("Gamma");
  expect(third.roomId).toBe(reconnected.roomId);
  await leaveAll([reconnected, third]);
}, 30_000);
