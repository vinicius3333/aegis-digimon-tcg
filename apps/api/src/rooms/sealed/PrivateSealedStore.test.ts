import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { beforeAll, beforeEach, afterAll, expect, it } from "vitest";
import { AccountStore } from "#api/accounts/AccountStore";
import { PrivateSealedStore } from "#api/rooms/sealed/PrivateSealedStore";
import { getCardDefinition } from "@aegis/shared/cards/registry";
import { CardKind } from "@aegis/shared/schema/enums";

const connectionString = process.env.SEALED_TEST_DATABASE_URL;
if (!connectionString?.startsWith("postgres://postgres@127.0.0.1:55439/")) {
  throw new Error("Private sealed SQL tests require isolated loopback Postgres 55439");
}
const schema = `private_sealed_${randomUUID().replaceAll("-", "")}`;
const admin = new Pool({ connectionString });
const pool = new Pool({ connectionString, options: `-c search_path=${schema}` });
const accounts = new AccountStore(pool);
const store = new PrivateSealedStore(accounts);
let host: string;
let guest: string;
const now = 1000000;
beforeEach(() => {
  host = randomUUID();
  guest = randomUUID();
});
beforeAll(async () => {
  await admin.query(`CREATE SCHEMA ${schema}`);
  await accounts.ensureReady();
});
afterAll(async () => {
  await pool.end();
  await admin.query(`DROP SCHEMA ${schema} CASCADE`);
  await admin.end();
});

async function createSeries() {
  const requestId = randomUUID();
  const input = { credential: host, name: "Host", setId: "BT4", requestId, now };
  const created = await store.create(input);
  return { created, input };
}
function chooseDeck(view: Awaited<ReturnType<PrivateSealedStore["view"]>>) {
  return {
    mainDeck: view.pool.packs
      .flat()
      .filter((pull) => !getCardDefinition(pull.cardId)!.kinds.includes(CardKind.DigiEgg))
      .slice(0, 40)
      .map((pull) => pull.artId ?? pull.cardId),
    eggDeck: [],
    revision: view.pool.revision,
    window: view.pool.window!,
  };
}
it("creates directly, allocates exactly once, and authenticates exactly two private seats", async () => {
  const { created, input } = await createSeries();
  expect(created.pool.packs).toEqual([]);
  const retries = await Promise.all([store.create(input), store.create(input)]);
  expect(retries.every((view) => view.code === created.code)).toBe(true);
  expect(retries[0]!.pool.packs).toEqual(created.pool.packs);
  await expect(store.view({ code: created.code, credential: guest, now })).rejects.toThrow("seat_required");
  const joined = await store.join({ code: created.code, credential: guest, name: "Guest", now });
  const unlocked = await store.view({ code: created.code, credential: host, now });
  expect(unlocked.pool.packs.map((pack) => pack.length)).toEqual([12, 12, 12, 12, 12, 12]);
  expect(joined.seat).toBe(1);
  expect(JSON.stringify(joined)).not.toContain(host);
  expect(JSON.stringify(joined)).not.toContain("credentialHash");
  await expect(store.join({ code: created.code, credential: randomUUID(), name: "Third", now })).rejects.toThrow(
    "room_full",
  );
  expect((await store.join({ code: created.code, credential: guest, name: "Guest", now })).pool.packs).toEqual(
    joined.pool.packs,
  );
  expect(
    (await new PrivateSealedStore(new AccountStore(pool)).view({ code: created.code, credential: host, now })).pool
      .packs,
  ).toEqual(unlocked.pool.packs);
  expect((await pool.query("SELECT count(*) FROM tournaments")).rows[0].count).toBe("0");
});
it("rejects invalid decks and stale revisions and idempotently locks ready submissions", async () => {
  const { created } = await createSeries();
  const owner = { code: created.code, credential: host, now };
  await store.join({ ...owner, credential: guest, name: "Guest" });
  const deck = chooseDeck(await store.view(owner));
  await expect(store.ready({ ...owner, ...deck, mainDeck: deck.mainDeck.slice(1) })).rejects.toThrow();
  await expect(store.ready({ ...owner, ...deck, eggDeck: Array(6).fill("BT4-001") })).rejects.toThrow();
  await expect(store.ready({ ...owner, ...deck, mainDeck: Array(40).fill(deck.mainDeck[0]) })).rejects.toThrow();
  const results = await Promise.all([store.ready({ ...owner, ...deck }), store.ready({ ...owner, ...deck })]);
  expect(results.every((view) => view.pool.revision === 1 && view.pool.ready)).toBe(true);
  await expect(store.ready({ ...owner, ...deck, mainDeck: [...deck.mainDeck].reverse() })).rejects.toThrow();
  await expect(
    store.start({ ...owner, createRoom: async () => "never", roomExists: async () => true }),
  ).rejects.toThrow("not_ready");
});
it("locks current deck snapshots, seats by authorization, records BO3 once and preserves pools", async () => {
  const { created } = await createSeries();
  const owner = { code: created.code, credential: host, now };
  const other = { ...owner, credential: guest };
  const joined = await store.join({ ...other, name: "Guest" });
  const originalPacks = (await store.view(owner)).pool.packs;
  await store.ready({ ...owner, ...chooseDeck(await store.view(owner)) });
  await store.ready({ ...other, ...chooseDeck(joined) });
  let calls = 0;
  const createRoom = async () => `room-${++calls}`;
  const attempts = await Promise.allSettled([
    store.start({ ...owner, createRoom, roomExists: async () => true }),
    store.start({ ...other, createRoom, roomExists: async () => true }),
  ]);
  expect(attempts.some((attempt) => attempt.status === "fulfilled")).toBe(true);
  const starts = [
    await store.start({ ...owner, createRoom, roomExists: async () => true }),
    await store.start({ ...other, createRoom, roomExists: async () => true }),
  ] as const;
  expect(calls).toBe(1);
  expect(starts[0].roomId).toBe(starts[1].roomId);
  const auth = await store.authorize({ gameId: starts[0].gameId, token: starts[0].token, roomId: starts[0].roomId });
  expect(auth.seat).toBe(0);
  expect(auth.deck.mainDeckArts).toEqual(chooseDeck(await store.view(owner)).mainDeck);
  await expect(
    store.authorize({ gameId: starts[0].gameId, token: starts[1].token, roomId: "forged" }),
  ).rejects.toThrow();
  await Promise.all([
    store.recordResult({ gameId: starts[0].gameId, roomId: starts[0].roomId, winner: 0, now: now + 1000 }),
    store.recordResult({ gameId: starts[0].gameId, roomId: starts[0].roomId, winner: 0, now: now + 1000 }),
  ]);
  const side = await store.view({ ...owner, now: now + 1001 });
  expect(side.score).toEqual([1, 0]);
  expect(side.pool.packs).toEqual(originalPacks);
  expect(side.pool.ready).toBe(false);
  const changed = { ...chooseDeck(side), mainDeck: [...chooseDeck(side).mainDeck].reverse() };
  await store.ready({ ...owner, ...changed, now: now + 1001 });
  await expect(store.start({ ...owner, now: now + 1002, createRoom, roomExists: async () => true })).rejects.toThrow(
    "not_ready",
  );
  await store.ready({ ...other, ...chooseDeck(await store.view({ ...other, now: now + 1001 })), now: now + 1001 });
  const next = await store.start({ ...owner, now: now + 1002, createRoom, roomExists: async () => true });
  expect((await store.authorize({ ...next })).deck.mainDeckArts).toEqual(changed.mainDeck);
  const persisted = (await pool.query("SELECT state FROM private_sealed_series WHERE code=$1", [created.code])).rows[0]
    .state;
  expect(persisted.games[0].decks[0].mainDeckArts).toEqual(chooseDeck(await store.view(owner)).mainDeck);
  await store.recordResult({ gameId: next.gameId, roomId: next.roomId, winner: 0, now: now + 2000 });
  expect(await store.view({ ...owner, now: now + 2001 })).toMatchObject({
    status: "complete",
    score: [2, 0],
    winner: 0,
  });
  await expect(store.start({ ...owner, createRoom, roomExists: async () => true })).rejects.toThrow();
});
it("times out initial building, retains previous legal decks after sideboard expiry and cancels interrupted engines", async () => {
  const { created } = await createSeries();
  const owner = { code: created.code, credential: host, now };
  expect(await store.view({ ...owner, now: now + 1800001 })).toMatchObject({
    status: "cancelled",
    reason: "build_timeout",
  });
  expect((await store.view({ ...owner, now: now + 1800002 })).pool.packs).toEqual(created.pool.packs);
  const next = (await createSeries()).created;
  const own = { ...owner, code: next.code };
  const other = { ...own, credential: guest };
  const joined = await store.join({ ...other, name: "Guest" });
  const originalDeck = chooseDeck(await store.view(own));
  await store.ready({ ...own, ...originalDeck });
  await store.ready({ ...other, ...chooseDeck(joined) });
  const createRoom = async () => randomUUID();
  const first = await store.start({ ...own, createRoom, roomExists: async () => true });
  await store.recordResult({ ...first, winner: null, now: now + 1000 });
  expect((await store.view({ ...own, now: now + 1001 })).score).toEqual([0, 0]);
  const second = await store.start({ ...own, now: now + 121001, createRoom, roomExists: async () => true });
  expect((await store.authorize(second)).deck.mainDeckArts).toEqual(originalDeck.mainDeck);
  await expect(store.authorize(first)).rejects.toThrow();
  await expect(store.start({ ...own, now: now + 121002, createRoom, roomExists: async () => false })).rejects.toThrow(
    "game_interrupted",
  );
  expect(await store.view({ ...own, now: now + 121003 })).toMatchObject({
    status: "cancelled",
    reason: "game_interrupted",
  });
});
it("cancels failed or stale starts without rerolling or binding an unauthorized room", async () => {
  const { created } = await createSeries();
  const owner = { code: created.code, credential: host, now };
  const joined = await store.join({ ...owner, credential: guest, name: "Guest" });
  const originalPacks = (await store.view(owner)).pool.packs;
  await store.ready({ ...owner, ...chooseDeck(await store.view(owner)) });
  await store.ready({ ...owner, credential: guest, ...chooseDeck(joined) });
  let closed: string | null = null;
  await expect(
    store.start({
      ...owner,
      roomExists: async () => true,
      createRoom: async () => {
        await store.cancel(owner);
        return "stale-room";
      },
      closeRoom: async (room) => {
        closed = room;
      },
    }),
  ).rejects.toThrow("series_closed");
  expect(closed).toBe("stale-room");
  expect((await store.view(owner)).pool.packs).toEqual(originalPacks);
});
it("records the locked revision pair with every immutable game snapshot", async () => {
  const { created } = await createSeries();
  const owner = { code: created.code, credential: host, now };
  const joined = await store.join({ ...owner, credential: guest, name: "Guest" });
  const originalPacks = (await store.view(owner)).pool.packs;
  await store.ready({ ...owner, ...chooseDeck(await store.view(owner)) });
  await store.ready({ ...owner, credential: guest, ...chooseDeck(joined) });
  await store.start({ ...owner, createRoom: async () => randomUUID(), roomExists: async () => true });
  const state = (await pool.query("SELECT state FROM private_sealed_series WHERE code=$1", [created.code])).rows[0]
    .state;
  expect(state.games[0].revisions).toEqual([1, 1]);
  expect((await store.view(owner)).pool.packs).toEqual(originalPacks);
});
it("returns the original room deployment when reconnecting through another deployment", async () => {
  const blue = new PrivateSealedStore(accounts, "blue");
  const created = await blue.create({ credential: host, name: "Host", setId: "BT4", requestId: randomUUID(), now });
  const owner = { code: created.code, credential: host, now };
  const guestView = await blue.join({ ...owner, credential: guest, name: "Guest" });
  await blue.ready({ ...owner, ...chooseDeck(await store.view(owner)) });
  await blue.ready({ ...owner, credential: guest, ...chooseDeck(guestView) });
  const first = await blue.start({ ...owner, createRoom: async () => "blue-room", roomExists: async () => true });
  expect(first.slot).toBe("blue");
  const green = new PrivateSealedStore(accounts, "green");
  expect(
    (
      await green.start({
        ...owner,
        createRoom: async () => "wrong-room",
        roomExists: async () => {
          throw new Error("Different slots have isolated matchmakers");
        },
      })
    ).slot,
  ).toBe("blue");
});

it.each(["EX13", "BT26"])("freezes %s for both seats and every game across store restarts", async (setId) => {
  const input = { credential: host, name: "Host", requestId: randomUUID(), now, setId };
  const created = await store.create(input);
  expect(created.pool.configuration.setId).toBe(setId);
  const owner = { code: created.code, credential: host, now };
  const fresh = new PrivateSealedStore(new AccountStore(pool));
  await expect(fresh.create({ ...input, setId: "BT4" })).rejects.toThrow("creation_conflict");
  expect((await fresh.create(input)).pool).toEqual(created.pool);
  const joined = await fresh.join({ ...owner, credential: guest, name: "Guest" });
  const originalPacks = (await fresh.view(owner)).pool.packs;
  expect(joined.pool.configuration).toEqual(created.pool.configuration);
  expect(joined.pool.packs.flat().every((pull) => pull.cardId.startsWith(`${setId}-`))).toBe(true);
  await fresh.ready({ ...owner, ...chooseDeck(await store.view(owner)) });
  await fresh.ready({ ...owner, credential: guest, ...chooseDeck(joined) });
  const game = await fresh.start({ ...owner, createRoom: async () => randomUUID(), roomExists: async () => true });
  await fresh.recordResult({ ...game, winner: 0, now: now + 1000 });
  const side = await new PrivateSealedStore(new AccountStore(pool)).view({ ...owner, now: now + 1001 });
  expect(side.pool.configuration).toEqual(created.pool.configuration);
  expect(side.pool.packs).toEqual(originalPacks);
  expect(side.pool.deadlineAt).toBe(now + 121000);
  const next = await fresh.start({
    ...owner,
    now: now + 121001,
    createRoom: async () => randomUUID(),
    roomExists: async () => true,
  });
  expect((await fresh.authorize(next)).deck.mainDeckArts).toEqual(chooseDeck(await store.view(owner)).mainDeck);
});

it("uses BT4 only for legacy rows without a persisted configuration", async () => {
  const { created } = await createSeries();
  await pool.query("UPDATE private_sealed_series SET state=state-'configuration'-'version' WHERE code=$1", [
    created.code,
  ]);
  const fresh = new PrivateSealedStore(new AccountStore(pool));
  expect((await fresh.view({ code: created.code, credential: host, now })).pool.configuration.setId).toBe("BT4");
  const joined = await fresh.join({ code: created.code, credential: guest, name: "Guest", now });
  expect(joined.pool.configuration.setId).toBe("BT4");
  expect(joined.pool.packs.flat().every((pull) => pull.cardId.startsWith("BT4-"))).toBe(true);
});

it("rejects a malformed versioned configuration instead of applying legacy compatibility", async () => {
  const { created } = await createSeries();
  await pool.query(
    "UPDATE private_sealed_series SET state=jsonb_set(state,'{configuration,setId}','\"BT27\"'::jsonb) WHERE code=$1",
    [created.code],
  );
  await expect(store.view({ code: created.code, credential: host, now })).rejects.toThrow(
    "sealed_configuration_invalid",
  );
});

it.each([999, 1, null, undefined])(
  "rejects persisted version %s even with a valid product configuration",
  async (version) => {
    const created = await store.create({ credential: host, name: "Host", requestId: randomUUID(), now, setId: "EX13" });
    await pool.query("UPDATE private_sealed_series SET state=(state-'version') || $1::jsonb WHERE code=$2", [
      JSON.stringify({ version }),
      created.code,
    ]);
    const fresh = new PrivateSealedStore(new AccountStore(pool));
    await expect(fresh.view({ code: created.code, credential: host, now })).rejects.toThrow(
      "sealed_configuration_invalid",
    );
  },
);

it("rejects persisted version 2 without a product configuration", async () => {
  const { created } = await createSeries();
  await pool.query("UPDATE private_sealed_series SET state=state-'configuration' WHERE code=$1", [created.code]);
  const fresh = new PrivateSealedStore(new AccountStore(pool));
  await expect(fresh.view({ code: created.code, credential: host, now })).rejects.toThrow(
    "sealed_configuration_invalid",
  );
});

it.each(["EX13", "BT26"])("accepts persisted version 2 with the frozen %s configuration", async (setId) => {
  const created = await store.create({ credential: host, name: "Host", requestId: randomUUID(), now, setId });
  const persisted = (await pool.query("SELECT state FROM private_sealed_series WHERE code=$1", [created.code])).rows[0]
    .state;
  expect(persisted.version).toBe(2);
  const fresh = new PrivateSealedStore(new AccountStore(pool));
  expect((await fresh.view({ code: created.code, credential: host, now })).pool.configuration).toEqual(
    created.pool.configuration,
  );
});
