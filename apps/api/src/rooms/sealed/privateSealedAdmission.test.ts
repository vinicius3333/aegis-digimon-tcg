import { getPrivateSealedResults } from "#api/rooms/sealed/getPrivateSealedResults";
import { PrivateSealedResults } from "#api/rooms/sealed/PrivateSealedResults";
import { PrivateSealedStore } from "#api/rooms/sealed/PrivateSealedStore";
import { gunzipSync } from "node:zlib";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import { Pool } from "pg";
import { Server, matchMaker, CloseCode, type Client } from "colyseus";
import { beforeAll, beforeEach, afterAll, expect, it, vi } from "vitest";
import { AccountStore } from "#api/accounts/AccountStore";
import { AegisRoom, roomRegistry } from "#api/rooms/AegisRoom";
import { installPrivateSealedRoutes } from "#api/rooms/sealed/installPrivateSealedRoutes";
import { createGameTransport } from "#api/connections/createGameTransport";
import { CardKind } from "@aegis/shared/schema/enums";
import { getCardDefinition } from "@aegis/shared/cards/registry";
import type { PrivateSealedView, PrivateSealedGameTicket } from "@aegis/shared/sealed/private/PrivateSealedContracts";
import { extractReplay } from "#api/replays/inputs/extract";
import { addLogSink } from "#api/logger";
import { runReplay } from "#api/replays/inputs/run";

const connectionString = process.env.SEALED_TEST_DATABASE_URL;
if (!connectionString?.startsWith("postgres://postgres@127.0.0.1:55439/")) {
  throw new Error("Isolated Postgres 55439 required");
}
const schema = `private_admission_${randomUUID().replaceAll("-", "")}`;
const admin = new Pool({ connectionString });
const pool = new Pool({ connectionString, options: `-c search_path=${schema}` });
const accounts = new AccountStore(pool);
class PrivateRoom extends AegisRoom {
  protected override accounts() {
    return accounts;
  }
}
const app = express();
app.use(express.json());
let routes = express();
app.use((req, res, next) => routes(req, res, next));
const http = createServer(app);
const server = new Server({ transport: createGameTransport({ server: http }), gracefullyShutdown: false });
server.define("aegis_private_sealed", PrivateRoom, { privateSealedRoom: true });
server.define("aegis_private", PrivateRoom, { private: true, privateSealedRoom: false, betaBattleRoom: true });
let base: string;
beforeEach(() => {
  routes = express();
  installPrivateSealedRoutes({ app: routes, accounts });
});
beforeAll(async () => {
  await admin.query(`CREATE SCHEMA ${schema}`);
  await accounts.ensureReady();
  await server.listen(0, "127.0.0.1");
  const port = (http.address() as AddressInfo).port;
  base = `http://127.0.0.1:${port}`;
});
afterAll(async () => {
  await server.gracefullyShutdown(false);
  await getPrivateSealedResults({ accounts }).close();
  await pool.end();
  await admin.query(`DROP SCHEMA ${schema} CASCADE`);
  await admin.end();
});
async function send(path: string, body?: unknown, cookie = "") {
  return fetch(`${base}/private-sealed${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
function chooseDeck(view: PrivateSealedView) {
  return {
    mainDeck: view.pool.packs
      .flat()
      .filter((card) => !getCardDefinition(card.cardId)!.kinds.includes(CardKind.DigiEgg))
      .slice(0, 40)
      .map((card) => card.artId ?? card.cardId),
    eggDeck: [],
    revision: view.pool.revision,
    window: view.pool.window,
  };
}
it("bounds repeated GET polls without reconciliation, RPCs or database mutations", async () => {
  const response = await send("", { name: "Host", setId: "BT4", requestId: randomUUID() });
  const cookie = response.headers.get("set-cookie")!.split(";")[0]!;
  const own = (await response.json()) as PrivateSealedView;
  const listings = vi.spyOn(matchMaker.driver, "query");
  const remote = vi.spyOn(matchMaker.presence, "publish");
  const flush = vi.spyOn(getPrivateSealedResults({ accounts }), "flush");
  const current = vi
    .spyOn(PrivateSealedStore.prototype, "getCurrentGame")
    .mockResolvedValue({ gameId: randomUUID(), roomId: "fake-active-room", slot: "legacy", finishedAt: null });
  const connection = await pool.connect();
  connection.release();
  const queries = vi.spyOn(connection, "query");
  try {
    const statuses = [];
    for (let count = 0; count < 80; count++) {
      statuses.push((await send(`/${own.code}`, undefined, cookie)).status);
    }
    expect(statuses).toContain(200);
    expect(statuses).toContain(429);
    expect(current).not.toHaveBeenCalled();
    expect(listings).not.toHaveBeenCalled();
    expect(remote).not.toHaveBeenCalled();
    expect(flush).not.toHaveBeenCalled();
    expect(queries.mock.calls.length).toBeGreaterThan(0);
    expect(
      queries.mock.calls.every((call) => /^SELECT /i.test(String(call[0])) && !/FOR UPDATE/i.test(String(call[0]))),
    ).toBe(true);
  } finally {
    queries.mockRestore();
    flush.mockRestore();
    listings.mockRestore();
    remote.mockRestore();
    current.mockRestore();
  }
});
it("rejects missing seat credentials, third players, malformed bodies and forged game creation", async () => {
  const input = { name: "CobaltWarden", setId: "BT4", requestId: randomUUID() };
  const response = await send("", input);
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  const cookie = response.headers.get("set-cookie")!.split(";")[0]!;
  expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  expect(response.headers.get("set-cookie")).toContain("SameSite=Strict");
  let created = (await response.json()) as PrivateSealedView;
  expect((await send(`/${created.code}`)).status).toBe(403);
  expect(created.players).toEqual(["CobaltWarden"]);
  const retry = await send("", { ...input, name: "Changed web name" }, cookie);
  expect(retry.status).toBe(200);
  const retried = (await retry.json()) as PrivateSealedView;
  expect(retried.code).toBe(created.code);
  expect(retried.players).toEqual(["CobaltWarden"]);
  expect(retried.pool.packs).toEqual(created.pool.packs);
  expect(
    (await send(`/${created.code}/ready`, { mainDeck: {}, eggDeck: [], revision: 0, window: "game:1" }, cookie)).status,
  ).toBe(400);
  const second = await send(`/${created.code}/join`, { name: "Guest" });
  expect(second.status).toBe(200);
  const guestCookie = second.headers.get("set-cookie")!.split(";")[0]!;
  const guestView = (await second.json()) as PrivateSealedView;
  created = (await (await send(`/${created.code}`, undefined, cookie)).json()) as PrivateSealedView;
  expect(guestView.seat).toBe(1);
  const rejoined = await send(`/${created.code}/join`, { name: "CobaltWarden", accountId: "forged" }, guestCookie);
  expect(rejoined.status).toBe(200);
  const resumed = (await rejoined.json()) as PrivateSealedView;
  expect(resumed.players).toEqual(["CobaltWarden", "Guest"]);
  expect(resumed.seat).toBe(1);
  expect(resumed.pool.packs).toEqual(guestView.pool.packs);
  expect(JSON.stringify(resumed)).not.toContain("forged");
  expect((await send(`/${created.code}/join`, { name: "Third" })).status).toBe(409);
  expect((await send(`/${created.code}/ready`, { ...chooseDeck(created), mainDeck: [] }, cookie)).status).toBe(409);
  expect((await send(`/${created.code}/start`, {}, cookie)).status).toBe(409);
  await expect(
    matchMaker.createRoom("aegis_private_sealed", { privateSealedCapability: "forged", deck: chooseDeck(created) }),
  ).rejects.toThrow();
  expect((await send(`/${created.code}`, undefined, cookie)).status).toBe(200);
});
it("seats locked decks in fixed seat order, refuses duplicate/forged authorization and propagates policy to replays", async () => {
  const logs: string[] = [];
  const removeSink = addLogSink((entry) => {
    logs.push(entry);
  });
  const response = await send("", { name: "Host", setId: "BT4", requestId: randomUUID() });
  const hostCookie = response.headers.get("set-cookie")!.split(";")[0]!;
  let created = (await response.json()) as PrivateSealedView;
  const joined = await send(`/${created.code}/join`, { name: "Guest" });
  const guestCookie = joined.headers.get("set-cookie")!.split(";")[0]!;
  const guest = (await joined.json()) as PrivateSealedView;
  created = (await (await send(`/${created.code}`, undefined, hostCookie)).json()) as PrivateSealedView;
  expect((await send(`/${created.code}/ready`, chooseDeck(created), hostCookie)).status).toBe(200);
  expect((await send(`/${created.code}/ready`, chooseDeck(guest), guestCookie)).status).toBe(200);
  const ticket = (await (await send(`/${created.code}/start`, {}, hostCookie)).json()) as PrivateSealedGameTicket;
  const other = (await (await send(`/${created.code}/start`, {}, guestCookie)).json()) as PrivateSealedGameTicket;
  const game = roomRegistry.get(ticket.roomId)!;
  expect(game.state.rulesPolicy).toBe("sealed-v1");
  const retryResult = vi.spyOn(game, "retryPrivateSealedResult");
  const pendingView = await send(`/${created.code}`, undefined, hostCookie);
  expect(pendingView.status).toBe(200);
  expect(((await pendingView.json()) as PrivateSealedView).status).toBe("playing");
  expect(retryResult).not.toHaveBeenCalled();
  retryResult.mockRestore();
  expect(game.spectatorInfo(game.state.roomCode)).toBeNull();
  game.setPatchRate(null);
  game.broadcast = () => true;
  const forged = { sessionId: "forged", send: () => {} } as unknown as Client;
  expect(
    await game.onAuth(forged, {
      privateSealedGame: { ...ticket, token: "forged" },
      displayName: "Forged",
      deck: { mainDeck: [], eggDeck: [] },
    }),
  ).toBe(false);
  const guestClient = { sessionId: "guest", send: () => {} } as unknown as Client;
  const guestOptions = {
    privateSealedGame: other,
    displayName: "Forged",
    deck: { mainDeck: [], eggDeck: [] },
    unlimited: true,
    bestOf: 1 as const,
  };
  expect(await game.onAuth(guestClient, guestOptions)).toBe(true);
  game.clients.push(guestClient);
  game.onJoin(guestClient, guestOptions);
  const hostOptions = { privateSealedGame: ticket, displayName: "Forged", deck: { mainDeck: [], eggDeck: [] } };
  const firstHostClient = { sessionId: "host", send: () => {} } as unknown as Client;
  const duplicateClient = { sessionId: "duplicate", send: () => {} } as unknown as Client;
  const duplicate = await Promise.all([
    game.onAuth(firstHostClient, hostOptions),
    game.onAuth(duplicateClient, hostOptions),
  ]);
  expect(duplicate.filter(Boolean)).toHaveLength(1);
  const hostClient = [firstHostClient, duplicateClient][duplicate.findIndex(Boolean)]!;
  game.clients.push(hostClient);
  game.onJoin(hostClient, hostOptions);
  await expect.poll(() => game.state.players.length).toBe(2);
  expect(game.state.players[0]!.displayName).toBe("Host");
  expect(game.state.players[1]!.displayName).toBe("Guest");
  expect(Reflect.get(game, "initialDeckBySeat").get(0).mainDeckArts).toEqual(chooseDeck(created).mainDeck);
  const drive = Reflect.get(game, "handleIntent").bind(game);
  drive(hostClient, { type: "ready" });
  drive(guestClient, { type: "ready" });
  await expect.poll(() => game.state.players[0]?.hand.length).toBe(5);
  drive(guestClient, { type: "surrender" });
  await expect
    .poll(
      async () => ((await (await send(`/${created.code}`, undefined, hostCookie)).json()) as PrivateSealedView).score,
    )
    .toEqual([1, 0]);
  expect(game.state.gameOver).toBe(true);
  const download = await Reflect.get(game, "buildParticipantReplayDownload").call(game, 0);
  expect(download.kind).toBe("ready");
  const participant = JSON.parse(gunzipSync(Buffer.from(download.data, "base64")).toString());
  expect(participant.visibleHandSeats).toEqual([0]);
  expect(participant.decks[1]).toBeNull();
  expect(participant.decks[0].mainDeck).toHaveLength(40);
  expect(
    participant.frames.every((frame: { state: { players: { seat: number; hand: unknown[] }[] } }) =>
      frame.state.players.every((player) => player.seat === 0 || player.hand.length === 0),
    ),
  ).toBe(true);
  expect(JSON.stringify(participant)).not.toContain('"packs"');
  expect(JSON.stringify(participant)).not.toContain('"tokens"');
  expect(JSON.stringify(logs)).not.toContain(hostCookie.split("=")[1]);
  removeSink();
  const record = extractReplay(logs, game.state.matchLogId);
  expect(record.rules.rulesPolicy).toBe("sealed-v1");
  expect(JSON.stringify(record)).not.toContain('"packs"');
  const replay = await runReplay(record);
  expect(replay.divergences).toEqual([]);
  expect(replay.state.rulesPolicy).toBe("sealed-v1");
  expect(replay.state.gameOver).toBe(true);
  game.clients.splice(0, game.clients.length);
});
it("rejects cross-site writes and never accepts a client credential or seat selector", async () => {
  const denied = await fetch(`${base}/private-sealed`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Sec-Fetch-Site": "cross-site" },
    body: JSON.stringify({ name: "Attacker", requestId: randomUUID() }),
  });
  expect(denied.status).toBe(403);
  const createdResponse = await send("", { name: "Owner", setId: "BT4", requestId: randomUUID() });
  const created = (await createdResponse.json()) as PrivateSealedView;
  const attempt = await send(`/${created.code}/ready`, { ...chooseDeck(created), seat: 0, credential: "forged" });
  expect(attempt.status).toBe(403);
});

it.each([true, false])("reclaims the same frozen prestart seat after departure with consent=%s", async (consented) => {
  const response = await send("", { name: "Host", setId: "BT4", requestId: randomUUID() });
  const cookie = response.headers.get("set-cookie")!.split(";")[0]!;
  let own = (await response.json()) as PrivateSealedView;
  const joined = await send(`/${own.code}/join`, { name: "Guest" });
  const otherCookie = joined.headers.get("set-cookie")!.split(";")[0]!;
  const other = (await joined.json()) as PrivateSealedView;
  own = (await (await send(`/${own.code}`, undefined, cookie)).json()) as PrivateSealedView;
  await send(`/${own.code}/ready`, chooseDeck(own), cookie);
  await send(`/${own.code}/ready`, chooseDeck(other), otherCookie);
  const ticket = (await (await send(`/${own.code}/start`, {}, cookie)).json()) as PrivateSealedGameTicket;
  const otherTicket = (await (await send(`/${own.code}/start`, {}, otherCookie)).json()) as PrivateSealedGameTicket;
  const game = roomRegistry.get(ticket.roomId)!;
  game.setPatchRate(null);
  game.broadcast = () => true;
  const host = { sessionId: randomUUID(), send: () => {} } as unknown as Client;
  const guest = { sessionId: randomUUID(), send: () => {} } as unknown as Client;
  const hostOptions = { displayName: "Untrusted", deck: { mainDeck: [], eggDeck: [] }, privateSealedGame: ticket };
  const guestOptions = { ...hostOptions, privateSealedGame: otherTicket };
  try {
    for (const [client, options] of [
      [host, hostOptions],
      [guest, guestOptions],
    ] as const) {
      expect(await game.onAuth(client, options)).toBe(true);
      game.clients.push(client);
      game.onJoin(client, options);
    }
    const drive = Reflect.get(game, "handleIntent").bind(game);
    drive(host, { type: "ready" });
    const originalDeck = structuredClone(Reflect.get(game, "initialDeckBySeat").get(1));
    game.clients.splice(game.clients.indexOf(guest), 1);
    if (!consented) {
      Reflect.set(game, "holdSeatForReconnect", async () => {
        throw new Error("expired reconnect grace");
      });
    }
    await game.onLeave(guest, consented ? CloseCode.CONSENTED : 1006);
    expect(Reflect.get(game, "matchStartRequested")).toBe(false);
    const returning = { sessionId: randomUUID(), send: () => {} } as unknown as Client;
    expect(await game.onAuth(returning, guestOptions)).toBe(true);
    game.clients.push(returning);
    game.onJoin(returning, guestOptions);
    expect(game.state.players[1]!.sessionId).toBe(returning.sessionId);
    expect(Reflect.get(game, "initialDeckBySeat").get(1)).toEqual(originalDeck);
    drive(returning, { type: "ready" });
    await expect.poll(() => game.state.players[0]?.hand.length).toBe(5);
    expect(game.state.players[1]!.hand).toHaveLength(5);
    expect(Reflect.get(game, "matchStartRequested")).toBe(true);
    drive(returning, { type: "surrender" });
    await expect
      .poll(async () => ((await (await send(`/${own.code}`, undefined, cookie)).json()) as PrivateSealedView).score)
      .toEqual([1, 0]);
  } finally {
    game.clients.splice(0, game.clients.length);
  }
});

it("limits series creation per client without consuming another test's admission budget", async () => {
  for (let attempt = 0; attempt < 6; attempt++) {
    expect((await send("", {})).status).toBe(400);
  }
  const limited = await send("", { name: "CobaltWarden", setId: "BT4", requestId: randomUUID() });
  expect(limited.status).toBe(429);
  expect(await limited.json()).toEqual({ error: "rate_limited" });
  expect(limited.headers.get("set-cookie")).toBeNull();
});

it("retains a finished room result across a failed write, disposal and journal recovery", async () => {
  const response = await send("", { name: "Host", setId: "BT4", requestId: randomUUID() });
  expect({ status: response.status, body: await response.clone().json() }).toMatchObject({ status: 200 });
  const cookie = response.headers.get("set-cookie")!.split(";")[0]!;
  let own = (await response.json()) as PrivateSealedView;
  const joined = await send(`/${own.code}/join`, { name: "Guest" });
  const otherCookie = joined.headers.get("set-cookie")!.split(";")[0]!;
  const other = (await joined.json()) as PrivateSealedView;
  own = (await (await send(`/${own.code}`, undefined, cookie)).json()) as PrivateSealedView;
  await send(`/${own.code}/ready`, chooseDeck(own), cookie);
  await send(`/${own.code}/ready`, chooseDeck(other), otherCookie);
  const ticket = (await (await send(`/${own.code}/start`, {}, cookie)).json()) as PrivateSealedGameTicket;
  const otherTicket = (await (await send(`/${own.code}/start`, {}, otherCookie)).json()) as PrivateSealedGameTicket;
  const game = roomRegistry.get(ticket.roomId)!;
  game.setPatchRate(null);
  game.broadcast = () => true;
  const host = { sessionId: randomUUID(), send: () => {} } as unknown as Client;
  const guest = { sessionId: randomUUID(), send: () => {} } as unknown as Client;
  const results = getPrivateSealedResults({ accounts });
  const original = PrivateSealedStore.prototype.recordResult;
  let unavailable = true;
  let attempts = 0;
  PrivateSealedStore.prototype.recordResult = async function (input) {
    attempts++;
    if (unavailable) {
      throw new Error("injected transient result write failure");
    }
    return original.call(this, input);
  };
  try {
    for (const [client, authorization] of [
      [host, ticket],
      [guest, otherTicket],
    ] as const) {
      const options = { displayName: "Ignored", deck: { mainDeck: [], eggDeck: [] }, privateSealedGame: authorization };
      expect(await game.onAuth(client, options)).toBe(true);
      game.clients.push(client);
      game.onJoin(client, options);
    }
    const drive = Reflect.get(game, "handleIntent").bind(game);
    drive(host, { type: "ready" });
    drive(guest, { type: "ready" });
    await expect.poll(() => game.state.players[0]?.hand.length).toBe(5);
    drive(guest, { type: "surrender" });
    await expect.poll(() => attempts).toBeGreaterThan(0);
    expect(results.hasPending(ticket.gameId)).toBe(true);
    const blocked = await send(`/${own.code}/start`, {}, cookie);
    expect(blocked.status).toBe(409);
    expect(await blocked.json()).toEqual({ error: "result_pending" });
    expect(
      (await pool.query("SELECT state FROM private_sealed_series WHERE code=$1", [own.code])).rows[0].state.score,
    ).toEqual([0, 0]);
    game.clients.splice(0, game.clients.length);
    await game.disconnect();
    unavailable = false;
    const recovery = new PrivateSealedResults({
      accounts: new AccountStore(pool),
      directory: results.directory,
      automatic: false,
    });
    try {
      await recovery.runOnce();
      await results.flush(ticket.gameId);
      expect(((await (await send(`/${own.code}`, undefined, cookie)).json()) as PrivateSealedView).score).toEqual([
        1, 0,
      ]);
      const record = (
        await pool.query("SELECT room_id,winner,finished_at FROM private_sealed_results WHERE game_id=$1", [
          ticket.gameId,
        ])
      ).rows[0];
      expect(record.room_id).toBe(ticket.roomId);
      await recovery.enqueue({
        gameId: ticket.gameId,
        roomId: ticket.roomId,
        winner: 0,
        now: Number(record.finished_at),
      });
      expect(((await (await send(`/${own.code}`, undefined, cookie)).json()) as PrivateSealedView).score).toEqual([
        1, 0,
      ]);
      expect(
        (await pool.query("SELECT count(*) FROM private_sealed_results WHERE game_id=$1", [ticket.gameId])).rows[0]
          .count,
      ).toBe("1");
    } finally {
      await recovery.close();
    }
  } finally {
    PrivateSealedStore.prototype.recordResult = original;
    game.clients.splice(0, game.clients.length);
  }
});
