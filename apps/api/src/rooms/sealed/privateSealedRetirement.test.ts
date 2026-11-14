import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { PrivateSealedResults } from "#api/rooms/sealed/PrivateSealedResults";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { matchMaker } from "colyseus";
import { createPrivateSealedRoom } from "#api/rooms/sealed/createPrivateSealedRoom";
import { consumePrivateSealedRoomGrant } from "#api/rooms/sealed/consumePrivateSealedRoomGrant";

vi.mock("colyseus", () => ({ matchMaker: { createRoom: vi.fn<typeof matchMaker.createRoom>() } }));
import { AccountStore } from "#api/accounts/AccountStore";
import { PrivateSealedStore } from "#api/rooms/sealed/PrivateSealedStore";
import { getCardDefinition } from "@aegis/shared/cards/registry";
import { CardKind } from "@aegis/shared/schema/enums";

const connectionString = process.env.SEALED_TEST_DATABASE_URL;
if (!connectionString?.startsWith("postgres://postgres@127.0.0.1:55439/")) {
  throw new Error("Isolated Postgres 55439 required");
}
const schema = `private_retirement_${randomUUID().replaceAll("-", "")}`;
const admin = new Pool({ connectionString });
const pool = new Pool({ connectionString, options: `-c search_path=${schema}` });
const accounts = new AccountStore(pool);
const day = 24 * 60 * 60 * 1000;
const epoch = 1000000;
let store: PrivateSealedStore;
beforeAll(async () => {
  await admin.query(`CREATE SCHEMA ${schema}`);
  await accounts.ensureReady();
});
beforeEach(async () => {
  await pool.query("TRUNCATE private_sealed_series,private_sealed_results CASCADE");
  store = new PrivateSealedStore(accounts);
});
afterAll(async () => {
  await pool.end();
  await admin.query(`DROP SCHEMA ${schema} CASCADE`);
  await admin.end();
});

type Owner = { code: string; credential: string; now: number };
async function createReadySeries(credential = randomUUID(), now = epoch) {
  const input = { credential, requestId: randomUUID(), name: "Host", setId: "BT4", now };
  const created = await store.create(input);
  const owner = { credential, code: created.code, now };
  const guest = { ...owner, credential: randomUUID() };
  await store.join({ ...guest, name: "Guest" });
  await readySeat(owner);
  await readySeat(guest);
  return { owner, guest, input };
}
async function readySeat(owner: Owner) {
  const view = await store.view(owner);
  await store.ready({
    ...owner,
    mainDeck: view.pool.packs
      .flat()
      .filter((pull) => !getCardDefinition(pull.cardId)!.kinds.includes(CardKind.DigiEgg))
      .slice(0, 40)
      .map((pull) => pull.artId ?? pull.cardId),
    eggDeck: [],
    revision: view.pool.revision,
    window: view.pool.window!,
  });
}
async function startGame(owner: Owner) {
  return store.start({ ...owner, createRoom: async () => randomUUID(), roomExists: async () => true });
}
async function countSeries() {
  return Number((await pool.query("SELECT count(*) FROM private_sealed_series")).rows[0].count);
}
async function sweepAll(now: number) {
  for (let index = 0; index < 5; index++) {
    expect((await store.sweep({ now })).scanned).toBeLessThanOrEqual(32);
  }
}

it("deletes receipted complete and cancelled series after seven days across repeated creation cycles", async () => {
  const credential = randomUUID();
  const receipts: { gameId: string; roomId: string; winner: 0 | 1 | null; now: number }[] = [];
  for (let cycle = 0; cycle < 4; cycle++) {
    const now = epoch + cycle * 9 * day;
    for (const complete of [true, false]) {
      const { owner, guest } = await createReadySeries(credential, now);
      const first = await startGame(owner);
      const result = { gameId: first.gameId, roomId: first.roomId, winner: 0 as const, now: now + 1000 };
      await store.recordResult(result);
      receipts.push(result);
      if (complete) {
        await readySeat({ ...owner, now: now + 1001 });
        await readySeat({ ...guest, now: now + 1001 });
        const second = await startGame({ ...owner, now: now + 1002 });
        const final = { gameId: second.gameId, roomId: second.roomId, winner: 0 as const, now: now + 2000 };
        await store.recordResult(final);
        receipts.push(final);
      } else {
        await store.cancel({ ...owner, now: now + 2000 });
      }
      expect(await store.view({ ...owner, now: now + 2001 })).toMatchObject({
        status: complete ? "complete" : "cancelled",
        score: complete ? [2, 0] : [1, 0],
        winner: complete ? 0 : 1,
      });
    }
    expect(await countSeries()).toBe(2);
    await sweepAll(now + 7 * day);
    expect(await countSeries()).toBe(2);
    await sweepAll(now + 8 * day);
    expect(await countSeries()).toBe(0);
    expect(
      Number((await pool.query("SELECT count(*) FROM private_sealed_results WHERE series_id IS NULL")).rows[0].count),
    ).toBe(receipts.length);
    for (const receipt of receipts) {
      await new PrivateSealedStore(accounts).recordResult({ ...receipt, now: now + 8 * day });
      await expect(store.recordResult({ ...receipt, winner: 1 })).rejects.toThrow("result_conflict");
      await expect(store.recordResult({ ...receipt, roomId: "forged" })).rejects.toThrow("result_conflict");
      expect(
        (
          await pool.query("SELECT room_id,winner,finished_at FROM private_sealed_results WHERE game_id=$1", [
            receipt.gameId,
          ])
        ).rows,
      ).toEqual([{ room_id: receipt.roomId, winner: receipt.winner, finished_at: String(receipt.now) }]);
    }
    expect(Number((await pool.query("SELECT count(*) FROM private_sealed_results")).rows[0].count)).toBe(
      receipts.length,
    );
  }
  await expect(store.recordResult({ gameId: randomUUID(), roomId: "unknown", winner: 0 })).rejects.toThrow(
    "game_not_found",
  );
});

it("recovers the twelve retained slots after proven unclaimed room allocations fail before returning an ID", async () => {
  const credential = randomUUID();
  const inputs = [];
  vi.mocked(matchMaker.createRoom).mockRejectedValue(new Error("allocation unavailable"));
  for (let index = 0; index < 12; index++) {
    const { owner, input } = await createReadySeries(credential);
    inputs.push(input);
    await expect(
      store.start({
        ...owner,
        createRoom: (allocation) => createPrivateSealedRoom({ accounts, ...allocation }),
        roomExists: async () => true,
      }),
    ).rejects.toThrow("allocation unavailable");
    expect(await store.view(owner)).toMatchObject({ status: "cancelled", score: [0, 0], winner: null });
  }
  expect(await countSeries()).toBe(12);
  const first = inputs[0]!;
  expect((await new PrivateSealedStore(accounts).create(first)).code).toBe((await store.create(first)).code);
  await expect(store.create({ ...first, requestId: randomUUID() })).rejects.toThrow("host_series_limit");
  expect((await pool.query("SELECT count(*) FROM private_sealed_results")).rows[0].count).toBe("0");
  await sweepAll(epoch + 8 * day);
  expect(await countSeries()).toBe(0);
  expect((await pool.query("SELECT count(*) FROM private_sealed_room_grants")).rows[0].count).toBe("0");
  await store.create({ ...first, now: epoch + 8 * day, requestId: randomUUID() });
  expect(await countSeries()).toBe(1);
});

it("retains an unknown RPC outcome after the internal room has claimed its capability", async () => {
  const { owner } = await createReadySeries();
  let capability: unknown;
  vi.mocked(matchMaker.createRoom).mockImplementationOnce(async (_type, options) => {
    capability = (options as { privateSealedCapability: string }).privateSealedCapability;
    expect(await consumePrivateSealedRoomGrant({ accounts, capability })).not.toBeNull();
    throw new Error("response lost after room claim");
  });
  await expect(
    store.start({
      ...owner,
      createRoom: (allocation) => createPrivateSealedRoom({ accounts, ...allocation }),
      roomExists: async () => true,
    }),
  ).rejects.toThrow("response lost after room claim");
  const before = (await pool.query("SELECT state FROM private_sealed_series WHERE code=$1", [owner.code])).rows[0]
    .state;
  await sweepAll(epoch + 30 * day);
  expect(await countSeries()).toBe(1);
  expect(
    (await pool.query("SELECT state FROM private_sealed_series WHERE code=$1", [owner.code])).rows[0].state,
  ).toEqual(before);
  expect((await pool.query("SELECT count(*) FROM private_sealed_results")).rows[0].count).toBe("0");
  expect(await consumePrivateSealedRoomGrant({ accounts, capability })).toBeNull();
});

it("retires timed-out unclaimed allocations and rejects a delayed internal room claim", async () => {
  const { owner } = await createReadySeries();
  let release!: () => void;
  let entered!: () => void;
  const waiting = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const suspended = new Promise<void>((resolve) => {
    release = resolve;
  });
  const started = store.start({
    ...owner,
    createRoom: async (allocation) => {
      entered();
      await suspended;
      return createPrivateSealedRoom({ accounts, ...allocation });
    },
    roomExists: async () => true,
  });
  const outcome = started.catch((error: unknown) => error);
  await waiting;
  let lateClaim: unknown = "not attempted";
  vi.mocked(matchMaker.createRoom).mockImplementationOnce(async (_type, options) => {
    const capability = (options as { privateSealedCapability: string }).privateSealedCapability;
    lateClaim = await consumePrivateSealedRoomGrant({ accounts, capability });
    throw new Error("late room denied");
  });
  try {
    await sweepAll(epoch + 8 * day);
    expect(await countSeries()).toBe(0);
  } finally {
    release();
    expect(await outcome).toBeInstanceOf(Error);
  }
  expect(lateClaim).toBeNull();
  expect((await pool.query("SELECT count(*) FROM private_sealed_results")).rows[0].count).toBe("0");
  expect((await pool.query("SELECT count(*) FROM private_sealed_room_grants")).rows[0].count).toBe("0");
});

it("keeps all retained rows in the persistent cap and permits only identical request retries", async () => {
  const credential = randomUUID();
  const input = { credential, requestId: randomUUID(), name: "Host", setId: "BT4", now: epoch };
  const first = await store.create(input);
  await store.create({ ...input, requestId: randomUUID() });
  await store.create({ ...input, requestId: randomUUID() });
  await expect(new PrivateSealedStore(accounts).create({ ...input, requestId: randomUUID() })).rejects.toThrow(
    "host_series_limit",
  );
  expect(await countSeries()).toBe(3);
  expect((await new PrivateSealedStore(accounts).create(input)).code).toBe(first.code);
  await expect(store.create({ ...input, setId: "BT5" })).rejects.toThrow("creation_conflict");
  await pool.query(
    "UPDATE private_sealed_series SET state=jsonb_set(jsonb_set(state,'{status}','\"cancelled\"'),'{archived}','true')",
  );
  for (let index = 3; index < 12; index++) {
    const created = await store.create({ ...input, requestId: randomUUID() });
    await store.cancel({ code: created.code, credential, now: epoch });
  }
  expect(await countSeries()).toBe(12);
  await expect(store.create({ ...input, requestId: randomUUID() })).rejects.toThrow("host_series_limit");
  expect((await new PrivateSealedStore(accounts).create(input)).code).toBe(first.code);
});

it("preserves active games, authoritative pending memory and journals until a real receipt commits", async () => {
  const { owner } = await createReadySeries();
  const game = await startGame(owner);
  const directory = mkdtempSync(join(process.env.TMPDIR!, "retirement-journal-"));
  const result = { gameId: game.gameId, roomId: game.roomId, winner: 0 as const, now: epoch + 1000 };
  const failed = new PrivateSealedResults({
    accounts,
    directory,
    automatic: false,
    persist: async () => {
      throw new Error("database unavailable");
    },
  });
  try {
    await expect(failed.enqueue(result)).rejects.toThrow("database unavailable");
    const before = (await pool.query("SELECT state FROM private_sealed_series WHERE code=$1", [owner.code])).rows[0]
      .state;
    await sweepAll(epoch + 30 * day);
    expect(
      (await pool.query("SELECT state FROM private_sealed_series WHERE code=$1", [owner.code])).rows[0].state,
    ).toEqual(before);
    await store.cancel({ ...owner, now: epoch + 2000 });
    await sweepAll(epoch + 30 * day);
    expect(await countSeries()).toBe(1);
    expect(failed.hasPending(game.gameId)).toBe(true);
    expect(readdirSync(directory)).toEqual([`${game.gameId}.json`]);
    expect((await pool.query("SELECT count(*) FROM private_sealed_results")).rows[0].count).toBe("0");
  } finally {
    await failed.close();
  }
  const recovered = new PrivateSealedResults({ accounts, directory, automatic: false });
  try {
    await recovered.runOnce();
    expect(recovered.hasPending(game.gameId)).toBe(false);
    expect(readdirSync(directory)).toEqual([]);
    await sweepAll(epoch + 30 * day);
    expect(await countSeries()).toBe(0);
    await recovered.enqueue(result);
    expect(recovered.hasPending(game.gameId)).toBe(false);
    const unknown = { ...result, gameId: randomUUID() };
    await expect(recovered.enqueue(unknown)).rejects.toThrow("game_not_found");
    expect(recovered.hasPending(unknown.gameId)).toBe(true);
    expect(readdirSync(directory)).toEqual([`${unknown.gameId}.json`]);
    expect((await pool.query("SELECT room_id,winner,finished_at FROM private_sealed_results")).rows).toEqual([
      { room_id: game.roomId, winner: 0, finished_at: String(result.now) },
    ]);
  } finally {
    await recovered.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

it("reclaims abandoned sideboarding only after its deadline plus retention and durable receipts", async () => {
  const credential = randomUUID();
  const input = { credential, requestId: randomUUID(), name: "Host", setId: "BT4", now: epoch };
  const results = [];
  for (let index = 0; index < 3; index++) {
    const { owner } = await createReadySeries(credential);
    const game = await startGame(owner);
    const result = { gameId: game.gameId, roomId: game.roomId, winner: null, now: epoch + 1000 };
    await store.recordResult(result);
    results.push(result);
    expect(await store.view({ ...owner, now: epoch + 2000 })).toMatchObject({
      status: "sideboarding",
      score: [0, 0],
      winner: null,
    });
  }
  await expect(store.create(input)).rejects.toThrow("host_series_limit");
  await sweepAll(epoch + 7 * day);
  expect(await countSeries()).toBe(3);
  await sweepAll(epoch + 8 * day);
  expect(await countSeries()).toBe(0);
  for (const result of results) {
    await new PrivateSealedStore(accounts).recordResult(result);
  }
  expect((await pool.query("SELECT winner FROM private_sealed_results")).rows).toEqual([
    { winner: null },
    { winner: null },
    { winner: null },
  ]);
  await store.create({ ...input, now: epoch + 8 * day });
  expect(await countSeries()).toBe(1);
});

it("starts the full thirty-minute build window once on authenticated second-seat admission", async () => {
  const credential = randomUUID();
  const input = { credential, requestId: randomUUID(), name: "Host", setId: "BT4", now: epoch };
  const created = await store.create(input);
  const owner = { credential, code: created.code, now: epoch };
  const waiting = (await pool.query("SELECT state FROM private_sealed_series WHERE code=$1", [created.code])).rows[0]
    .state;
  expect(waiting.deadlineAt).toBe(epoch + 30 * 60000);
  const admittedAt = waiting.deadlineAt - 1;
  const guest = { ...owner, credential: randomUUID(), now: admittedAt, name: "Guest" };
  expect(await store.view({ ...owner, now: admittedAt })).toMatchObject({
    pool: { packs: [], window: null, editable: false, deadlineAt: null },
  });
  expect((await store.join({ ...owner, name: "Host", now: admittedAt - 1 })).pool.packs).toEqual([]);
  const joined = await store.join(guest);
  const deadlineAt = admittedAt + 30 * 60000;
  expect(joined.pool.deadlineAt).toBe(deadlineAt);
  const host = await store.view({ ...owner, now: admittedAt });
  expect(host.pool.deadlineAt).toBe(deadlineAt);
  expect(host.pool.packs.flat()).toHaveLength(72);
  expect(joined.pool.packs.flat()).toHaveLength(72);
  const duplicates = await Promise.all([
    store.join({ ...guest, now: admittedAt + 1000 }),
    store.join({ ...guest, now: admittedAt + 2000 }),
    store.join({ ...owner, name: "Host", now: admittedAt + 3000 }),
    new PrivateSealedStore(accounts).create({ ...input, now: admittedAt + 4000 }),
  ]);
  expect(duplicates.every((view) => view.pool.deadlineAt === deadlineAt)).toBe(true);
  await expect(store.join({ ...guest, credential: randomUUID(), now: admittedAt + 5000 })).rejects.toThrow("room_full");
  expect((await store.view({ ...owner, now: waiting.deadlineAt + 1 })).status).toBe("building");
  expect((await store.view({ ...owner, now: deadlineAt })).status).toBe("cancelled");
  expect(
    (await pool.query("SELECT state FROM private_sealed_series WHERE code=$1", [created.code])).rows[0].state
      .deadlineAt,
  ).toBe(deadlineAt);
  const another = await store.create({ ...input, credential: randomUUID(), requestId: randomUUID() });
  await expect(
    store.join({ code: another.code, credential: randomUUID(), name: "Late", now: epoch + 30 * 60000 }),
  ).rejects.toThrow("series_closed");
});
