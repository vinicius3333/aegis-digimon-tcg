import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { MAX_REPLAY_STORAGE_BYTES, type ReplayDownloadMessage } from "@aegis/shared";
import { AccountStore } from "../accounts/AccountStore.js";
import { ReplayLibrary } from "../replays/ReplayLibrary.js";
import { S3ReplayStorage, type ReplayStorage } from "../replays/storage.js";

const enabled = process.env.POSTGRES_TESTS === "1";
const connection = process.env.POSTGRES_TEST_URL;
if (enabled && !connection)
  throw new Error("Replay concurrency tests need POSTGRES_TEST_URL pointing to a scratch Postgres");
const schema = `replay_test_${randomUUID().replaceAll("-", "")}`;
const configPath = process.env.REPLAY_STORAGE_TEST_CONFIG;

describe.skipIf(!enabled)("real Postgres replay reservations and recovery", () => {
  let admin: Pool;
  let accounts: AccountStore;
  let pool: Pool;
  let storage: ReplayStorage;
  let library: ReplayLibrary;
  const owners: string[] = [];
  beforeAll(async () => {
    admin = new Pool({ connectionString: connection });
    await admin.query(`CREATE SCHEMA ${schema}`);
    pool = new Pool({ connectionString: connection, options: `-c search_path=${schema}`, max: 12 });
    accounts = new AccountStore(pool);
    if (configPath) {
      const env = JSON.parse(readFileSync(configPath, "utf8"));
      env.AEGIS_REPLAY_S3_ENDPOINT = process.env.REPLAY_STORAGE_TEST_ENDPOINT ?? env.AEGIS_REPLAY_S3_ENDPOINT;
      storage = S3ReplayStorage.fromEnvironment(env)!;
    } else {
      const files = new Map<string, Buffer>();
      storage = {
        async put(key, bytes) {
          files.set(key, bytes);
        },
        async get(key) {
          return files.get(key)!;
        },
        async remove(key) {
          files.delete(key);
        },
      };
    }
    library = new ReplayLibrary(accounts, storage);
    await accounts.ensureReady();
  });
  afterAll(async () => {
    if (accounts) {
      for (const id of owners) for (const replay of await library.list(id)) await library.remove(id, replay.id);
      await accounts.close();
    }
    if (admin) {
      await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      await admin.end();
    }
  });
  async function owner() {
    const account = await accounts.accountForIdentity("email", `${randomUUID()}@test.invalid`, "Replay Test");
    owners.push(account.id);
    return account.id;
  }
  function message(id = randomUUID()): Extract<ReplayDownloadMessage, { kind: "ready" }> {
    // Exercise the real private S3 service using the complete, server-produced demo archive.
    const bytes = configPath
      ? readFileSync(new URL("../../../web/public/replays/demo.aegis-replay", import.meta.url))
      : Buffer.from("test replay bytes");
    return {
      kind: "ready",
      data: bytes.toString("base64"),
      viewerSeat: 0,
      summary: { id, players: ["A", "B"], mode: "casual", startedAt: 1, finishedAt: 2, winnerSeat: 0, frameCount: 2 },
    };
  }
  it("serializes saves from independent API instances and never exceeds ten slots", async () => {
    const id = await owner();
    const sibling = new ReplayLibrary(accounts, storage);
    const results = await Promise.allSettled(
      Array.from({ length: 14 }, (_, index) => (index % 2 ? library : sibling).save(id, message())),
    );
    expect(results.filter((item) => item.status === "fulfilled")).toHaveLength(10);
    const rejected = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
    expect(rejected.map((result) => result.reason.code)).toEqual(Array(4).fill("limit"));
    expect(await library.list(id)).toHaveLength(10);
    const replay = (await library.list(id))[0]!;
    expect((await library.file(id, replay.id))?.bytes.length).toBe(replay.bytes);
    expect(await sibling.file(await owner(), replay.id)).toBeUndefined();
  }, 60000);
  it("deduplicates simultaneous saves of the same participant recording", async () => {
    const id = await owner();
    const file = message();
    const results = await Promise.all(Array.from({ length: 4 }, () => library.save(id, file)));
    expect(new Set(results.map((result) => result.id)).size).toBe(1);
    expect(await library.list(id)).toHaveLength(1);
  }, 30000);
  it("atomically reserves the global cap across different accounts", async () => {
    const a = await owner();
    const b = await owner();
    const before = Number((await pool.query("SELECT bytes FROM replay_storage_usage")).rows[0].bytes);
    const file = message();
    const size = Buffer.from(file.data, "base64").length;
    await pool.query("UPDATE replay_storage_usage SET bytes=$1", [MAX_REPLAY_STORAGE_BYTES - size]);
    try {
      const results = await Promise.allSettled([library.save(a, file), library.save(b, message())]);
      expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
      expect((results.find((result) => result.status === "rejected") as PromiseRejectedResult).reason.code).toBe(
        "storage_full",
      );
      expect(Number((await pool.query("SELECT bytes FROM replay_storage_usage")).rows[0].bytes)).toBe(
        MAX_REPLAY_STORAGE_BYTES,
      );
    } finally {
      // Restore the synthetic cap fixture before removing objects from these scratch accounts.
      await pool.query("UPDATE replay_storage_usage SET bytes=$1", [before + size]);
    }
  }, 30000);
  it("reclaims a failed delete once even when two API workers retry it concurrently", async () => {
    const id = await owner();
    const saved = await library.save(id, message());
    const before = Number((await pool.query("SELECT bytes FROM replay_storage_usage")).rows[0].bytes);
    const failing = new ReplayLibrary(accounts, {
      put: storage.put.bind(storage),
      get: storage.get.bind(storage),
      async remove() {
        throw new Error("offline");
      },
    });
    await expect(failing.remove(id, saved.id)).rejects.toThrow("offline");
    expect((await library.list(id))[0]!.status).toBe("deleting");
    await Promise.all([library.cleanup(), new ReplayLibrary(accounts, storage).cleanup()]);
    expect(await library.list(id)).toEqual([]);
    expect(Number((await pool.query("SELECT bytes FROM replay_storage_usage")).rows[0].bytes)).toBe(
      before - saved.bytes,
    );
  }, 30000);
});
