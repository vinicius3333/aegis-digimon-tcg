import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Pool } from "pg";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { AccountStore } from "#api/accounts/AccountStore";
import { PrivateSealedStore } from "#api/rooms/sealed/PrivateSealedStore";

const connectionString = process.env.SEALED_TEST_DATABASE_URL;
if (!connectionString?.startsWith("postgres://postgres@127.0.0.1:55439/")) {
  throw new Error("Isolated Postgres 55439 required");
}
const schema = `private_security_${randomUUID().replaceAll("-", "")}`;
const admin = new Pool({ connectionString });
const pool = new Pool({ connectionString, options: `-c search_path=${schema}` });
const accounts = new AccountStore(pool);
const store = new PrivateSealedStore(accounts);
const now = 1000000;
const execute = promisify(execFile);
beforeAll(async () => {
  await admin.query(`CREATE SCHEMA ${schema}`);
  await accounts.ensureReady();
});
afterAll(async () => {
  await pool.end();
  await admin.query(`DROP SCHEMA ${schema} CASCADE`);
  await admin.end();
});
it("bounds retention sweeps and preserves pending games and durable result receipts", async () => {
  const credential = randomUUID();
  const input = { credential, name: "Host", setId: "BT4", now };
  const abandoned = await store.create({ ...input, requestId: randomUUID() });
  const cancelled = await store.create({ ...input, requestId: randomUUID() });
  await store.cancel({ credential, code: cancelled.code, now });
  const pending = await store.create({ ...input, requestId: randomUUID() });
  const gameId = randomUUID();
  await pool.query(
    "UPDATE private_sealed_series SET state=jsonb_set(jsonb_set(state,'{status}','\"cancelled\"'),'{games}', $1::jsonb),current_game_id=$2 WHERE code=$3",
    [JSON.stringify([{ id: gameId, roomId: "pending-room", finishedAt: null, winner: null }]), gameId, pending.code],
  );
  const late = now + 8 * 24 * 60 * 60 * 1000;
  const batch = await store.sweep({ now: late });
  expect(batch.scanned).toBeLessThanOrEqual(32);
  expect(
    (await pool.query("SELECT code FROM private_sealed_series WHERE code=ANY($1)", [[abandoned.code, cancelled.code]]))
      .rows,
  ).toHaveLength(0);
  expect((await pool.query("SELECT code FROM private_sealed_series WHERE code=$1", [pending.code])).rows).toHaveLength(
    1,
  );
  await store.recordResult({ gameId, roomId: "pending-room", winner: 0, now });
  await store.sweep({ now: late });
  await store.sweep({ now: late });
  expect((await pool.query("SELECT state FROM private_sealed_series WHERE code=$1", [pending.code])).rows).toEqual([]);
  expect((await pool.query("SELECT series_id FROM private_sealed_results WHERE game_id=$1", [gameId])).rows).toEqual([
    { series_id: null },
  ]);
  expect((await pool.query("SELECT winner FROM private_sealed_results WHERE game_id=$1", [gameId])).rows).toEqual([
    { winner: 0 },
  ]);
  const replacement = await store.create({ ...input, now: late, requestId: randomUUID() });
  expect(replacement.code).not.toBe(pending.code);
});
it("limits retained cancelled allocations and keeps retries available at the limit", async () => {
  const credential = randomUUID();
  const input = { credential, requestId: randomUUID(), name: "Host", setId: "BT4", now };
  const first = await store.create(input);
  await store.cancel({ credential, code: first.code, now });
  for (let index = 1; index < 12; index++) {
    const created = await store.create({ ...input, requestId: randomUUID() });
    await store.cancel({ credential, code: created.code, now });
  }
  await expect(store.create({ ...input, requestId: randomUUID() })).rejects.toThrow("host_series_limit");
  expect((await new PrivateSealedStore(accounts).create(input)).code).toBe(first.code);
});
it("continues bounded sweeps across batches without touching live games or sideboarding", async () => {
  const credential = randomUUID();
  const created = await store.create({ credential, requestId: randomUUID(), name: "Host", setId: "BT4", now });
  const original = (await pool.query("SELECT state FROM private_sealed_series WHERE code=$1", [created.code])).rows[0]
    .state;
  const expiredCodes: string[] = [];
  const activeCodes: string[] = [];
  for (let index = 0; index < 42; index++) {
    const code = randomUUID().replaceAll("-", "").slice(0, 18).toUpperCase();
    const state = structuredClone(original);
    if (index < 40) {
      expiredCodes.push(code);
    } else {
      state.status = index === 40 ? "playing" : "sideboarding";
      activeCodes.push(code);
    }
    await pool.query("INSERT INTO private_sealed_series(id,code,host_hash,request_id,state) VALUES($1,$2,$3,$4,$5)", [
      randomUUID(),
      code,
      randomUUID(),
      randomUUID(),
      JSON.stringify(state),
    ]);
  }
  const fresh = new PrivateSealedStore(accounts);
  const batches = [];
  for (let index = 0; index < 5; index++) {
    batches.push(await fresh.sweep({ now: now + 8 * 24 * 60 * 60 * 1000 }));
  }
  expect(batches[0]!.scanned).toBe(32);
  expect(batches.every((batch) => batch.scanned <= 32)).toBe(true);
  expect((await pool.query("SELECT code FROM private_sealed_series WHERE code=ANY($1)", [expiredCodes])).rows).toEqual(
    [],
  );
  const active = (await pool.query("SELECT state FROM private_sealed_series WHERE code=ANY($1)", [activeCodes])).rows;
  expect(active).toHaveLength(2);
  expect(
    active.every((row) => !row.state.archived && JSON.stringify(row.state.seats) === JSON.stringify(original.seats)),
  ).toBe(true);
});
it("serializes the persistent host cap across independent stores without rejecting idempotent retries", async () => {
  const credential = randomUUID();
  const fresh = new PrivateSealedStore(new AccountStore(pool));
  const inputs = Array.from({ length: 8 }, () => ({
    credential,
    requestId: randomUUID(),
    name: "Host",
    setId: "BT4",
    now,
  }));
  const attempts = await Promise.allSettled(inputs.map((input, index) => (index % 2 ? store : fresh).create(input)));
  const accepted = attempts.filter((entry) => entry.status === "fulfilled");
  expect(accepted).toHaveLength(3);
  expect(
    attempts
      .filter((entry) => entry.status === "rejected")
      .every((entry) => entry.reason.message === "host_series_limit"),
  ).toBe(true);
  const index = attempts.findIndex((entry) => entry.status === "fulfilled");
  const retry = await fresh.create(inputs[index]!);
  expect(retry.code).toBe(accepted[0]!.value.code);
  const foreign = randomUUID();
  await expect(store.cancel({ code: retry.code, credential: foreign, now })).rejects.toThrow("seat_required");
  await expect(fresh.create({ ...inputs[0]!, requestId: randomUUID() })).rejects.toThrow("host_series_limit");
  const other = await store.create({
    credential: foreign,
    requestId: randomUUID(),
    name: "Guest host",
    setId: "BT4",
    now,
  });
  expect(other.code).not.toBe(retry.code);
});
it("enforces the same credential cap in separate Node processes", async () => {
  const credential = randomUUID();
  const inputs = Array.from({ length: 8 }, () => ({
    credential,
    requestId: randomUUID(),
    name: "Host",
    setId: "BT4",
    now,
  }));
  const source = `
    import { Pool } from "pg";
    import { AccountStore } from "#api/accounts/AccountStore";
    import { PrivateSealedStore } from "#api/rooms/sealed/PrivateSealedStore";
    const pool = new Pool({ connectionString: process.env.SEALED_TEST_DATABASE_URL, options: process.env.SEALED_SECURITY_OPTIONS });
    try {
      const store = new PrivateSealedStore(new AccountStore(pool));
      const inputs = JSON.parse(process.env.SEALED_SECURITY_INPUTS);
      const outcomes = await Promise.all(inputs.map(async (input) => {
        try {
          return { requestId: input.requestId, code: (await store.create(input)).code };
        } catch (error) {
          return { error: error.message };
        }
      }));
      process.stdout.write(JSON.stringify(outcomes));
    } finally {
      await pool.end();
    }
  `;
  const results = await Promise.all(
    [inputs.slice(0, 4), inputs.slice(4)].map(async (batch) => {
      const result = await execute(
        process.execPath,
        ["--conditions=development", "--import=./test-support/ts-loader.mjs", "--input-type=module", "-e", source],
        {
          env: {
            ...process.env,
            SEALED_SECURITY_OPTIONS: `-c search_path=${schema}`,
            SEALED_SECURITY_INPUTS: JSON.stringify(batch),
          },
        },
      );
      return JSON.parse(result.stdout) as { code?: string; requestId?: string; error?: string }[];
    }),
  );
  const outcomes = results.flat();
  const accepted = outcomes.filter((outcome) => outcome.code);
  expect(accepted).toHaveLength(3);
  expect(outcomes.filter((outcome) => outcome.error).map((outcome) => outcome.error)).toEqual(
    Array(5).fill("host_series_limit"),
  );
  const retry = inputs.find((input) => input.requestId === accepted[0]!.requestId)!;
  expect((await new PrivateSealedStore(accounts).create(retry)).code).toBe(accepted[0]!.code);
});
it("reads views without locks or writes and presents expiry without persisting it", async () => {
  const credential = randomUUID();
  const created = await store.create({ credential, requestId: randomUUID(), name: "Host", setId: "BT4", now });
  const owner = { credential, code: created.code, now: now + 1800001 };
  const before = (await pool.query("SELECT state FROM private_sealed_series WHERE code=$1", [created.code])).rows[0]
    .state;
  const connection = await pool.connect();
  connection.release();
  const query = vi.spyOn(connection, "query");
  try {
    for (let count = 0; count < 3; count++) {
      expect(await store.view(owner)).toMatchObject({ status: "cancelled", reason: "build_timeout" });
    }
    expect(query.mock.calls.length).toBeGreaterThan(0);
    expect(
      query.mock.calls.map((call) => String(call[0])).every((sql) => /^SELECT /i.test(sql) && !/FOR UPDATE/i.test(sql)),
    ).toBe(true);
  } finally {
    query.mockRestore();
  }
  expect(
    (await pool.query("SELECT state FROM private_sealed_series WHERE code=$1", [created.code])).rows[0].state,
  ).toEqual(before);
  expect(await store.cancel(owner)).toMatchObject({ status: "cancelled", reason: "player_cancelled" });
});
it("withholds all allocation until another credential commits the second seat", async () => {
  const credential = randomUUID();
  const input = { credential, requestId: randomUUID(), name: "Host", setId: "BT4", now };
  const created = await store.create(input);
  const owner = { credential, code: created.code, now };
  expect(created.pool.packs).toEqual([]);
  expect(created.pool.editable).toBe(false);
  expect(created.pool.window).toBeNull();
  expect((await store.create(input)).pool.packs).toEqual([]);
  expect((await store.join({ ...owner, name: "Host" })).pool.packs).toEqual([]);
  await expect(store.ready({ ...owner, revision: 0, window: "game:1", mainDeck: [], eggDeck: [] })).rejects.toThrow(
    "not_ready",
  );
  await expect(store.start({ ...owner, createRoom: vi.fn(), roomExists: async () => true })).rejects.toThrow(
    "not_ready",
  );
  await expect(store.join({ ...owner, credential: randomUUID(), name: "Late", now: now + 1800001 })).rejects.toThrow(
    "series_closed",
  );
  expect((await store.view(owner)).pool.packs).toEqual([]);
  const joined = await store.join({ ...owner, credential: randomUUID(), name: "Guest" });
  const host = await store.view(owner);
  expect(host.pool.packs.map((pack) => pack.length)).toEqual([12, 12, 12, 12, 12, 12]);
  expect(host.pool.editable).toBe(true);
  expect(JSON.stringify(host)).not.toContain(JSON.stringify(joined.pool.packs));
  await expect(store.join({ ...owner, credential: randomUUID(), name: "Third" })).rejects.toThrow("room_full");
  const fresh = new PrivateSealedStore(new AccountStore(pool));
  expect((await fresh.view(owner)).pool.packs).toEqual(host.pool.packs);
  expect((await fresh.create(input)).pool.packs).toEqual(host.pool.packs);
});
