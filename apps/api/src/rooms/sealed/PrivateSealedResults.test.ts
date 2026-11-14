import { randomUUID } from "node:crypto";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Pool } from "pg";
import { beforeAll, afterAll, expect, it } from "vitest";
import { AccountStore } from "#api/accounts/AccountStore";
import { PrivateSealedStore } from "#api/rooms/sealed/PrivateSealedStore";
import { PrivateSealedResults } from "#api/rooms/sealed/PrivateSealedResults";
import { getCardDefinition } from "@aegis/shared/cards/registry";
import { CardKind } from "@aegis/shared/schema/enums";
import type { PrivateSealedView } from "@aegis/shared/sealed/private/PrivateSealedContracts";

const connectionString = process.env.SEALED_TEST_DATABASE_URL;
if (!connectionString?.startsWith("postgres://postgres@127.0.0.1:55439/")) {
  throw new Error("Use isolated Postgres 55439");
}
const schema = `private_results_${randomUUID().replaceAll("-", "")}`;
const admin = new Pool({ connectionString });
const pool = new Pool({ connectionString, options: `-c search_path=${schema}` });
const accounts = new AccountStore(pool);
const store = new PrivateSealedStore(accounts);
const directory = mkdtempSync(join(tmpdir(), "private-sealed-results-test-"));
beforeAll(async () => {
  await admin.query(`CREATE SCHEMA ${schema}`);
  await accounts.ensureReady();
});
afterAll(async () => {
  await pool.end();
  await admin.query(`DROP SCHEMA ${schema} CASCADE`);
  await admin.end();
  rmSync(directory, { recursive: true, force: true });
});
function chooseDeck(view: PrivateSealedView) {
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
it("recovers a journaled authoritative result after failed persistence and worker restart exactly once", async () => {
  const now = Date.now();
  const credential = randomUUID();
  const guest = randomUUID();
  const own = await store.create({ credential, name: "Host", setId: "BT4", requestId: randomUUID(), now });
  const owner = { code: own.code, credential, now };
  const other = await store.join({ ...owner, credential: guest, name: "Guest" });
  const unlocked = await store.view(owner);
  await store.ready({ ...owner, ...chooseDeck(unlocked) });
  await store.ready({ ...owner, credential: guest, ...chooseDeck(other) });
  const game = await store.start({
    ...owner,
    createRoom: async () => "finished-engine-room",
    roomExists: async () => true,
  });
  const outcome = { gameId: game.gameId, roomId: game.roomId, winner: 0 as const, now: now + 1000 };
  let attempts = 0;
  const failed = new PrivateSealedResults({
    accounts,
    directory,
    automatic: false,
    persist: async () => {
      attempts++;
      throw new Error("database unavailable");
    },
  });
  try {
    await expect(failed.enqueue(outcome)).rejects.toThrow("database unavailable");
    expect(attempts).toBe(1);
    expect(failed.hasPending(game.gameId)).toBe(true);
    expect(readdirSync(directory)).toContain(`${game.gameId}.json`);
    expect((await store.view(owner)).score).toEqual([0, 0]);
  } finally {
    await failed.close();
  }
  const recovered = new PrivateSealedResults({ accounts: new AccountStore(pool), directory, automatic: false });
  try {
    await recovered.runOnce();
    expect((await store.view(owner)).score).toEqual([1, 0]);
    expect((await store.view(owner)).status).toBe("sideboarding");
    expect(recovered.hasPending(game.gameId)).toBe(false);
    expect(readdirSync(directory)).toEqual([]);
    await recovered.enqueue(outcome);
    await recovered.runOnce();
    expect((await store.view(owner)).score).toEqual([1, 0]);
    const next = await store.start({
      ...owner,
      now: now + 121001,
      createRoom: async () => "next-room",
      roomExists: async () => true,
    });
    expect(next.gameId).not.toBe(game.gameId);
    await recovered.enqueue(outcome);
    expect((await store.view(owner)).score).toEqual([1, 0]);
    expect(
      (await pool.query("SELECT count(*) FROM private_sealed_results WHERE game_id=$1", [game.gameId])).rows[0].count,
    ).toBe("1");
    await expect(recovered.enqueue({ ...outcome, winner: 1 })).rejects.toThrow("result_conflict");
    expect((await store.view(owner)).pool.packs).toEqual(unlocked.pool.packs);
  } finally {
    await recovered.close();
  }
});
it.each([false, true])(
  "reconciles corrupt journal with existing DB state before cancellation (recorded: %s)",
  async (recorded) => {
    const now = Date.now();
    const credential = randomUUID();
    const guest = randomUUID();
    const own = await store.create({ credential, name: "Host", setId: "BT4", requestId: randomUUID(), now });
    const owner = { code: own.code, credential, now };
    const other = await store.join({ ...owner, credential: guest, name: "Guest" });
    const unlocked = await store.view(owner);
    await store.ready({ ...owner, ...chooseDeck(unlocked) });
    await store.ready({ ...owner, credential: guest, ...chooseDeck(other) });
    const game = await store.start({
      ...owner,
      createRoom: async () => "corrupt-journal-room",
      roomExists: async () => true,
    });
    const outcome = { gameId: game.gameId, roomId: game.roomId, winner: 0 as const, now: now + 1000 };
    if (recorded) {
      await store.recordResult(outcome);
    }
    const isolated = mkdtempSync(join(tmpdir(), "private-sealed-corrupt-test-"));
    const results = new PrivateSealedResults({ accounts, directory: isolated, automatic: false });
    try {
      writeFileSync(join(isolated, `${game.gameId}.json`), "{");
      await results.flush(game.gameId);
      expect(results.hasPending(game.gameId)).toBe(false);
      expect((await store.getCurrentGame(owner))?.finishedAt).toBe(recorded ? outcome.now : null);
      expect((await store.view(owner)).score).toEqual(recorded ? [1, 0] : [0, 0]);
      const cancelled = await store.cancel({ ...owner, interrupted: !recorded });
      expect(cancelled.status).toBe("cancelled");
      expect(cancelled.score).toEqual(recorded ? [1, 0] : [0, 0]);
      expect(
        (await pool.query("SELECT count(*) FROM private_sealed_results WHERE game_id=$1", [game.gameId])).rows[0].count,
      ).toBe(recorded ? "1" : "0");
      if (recorded) {
        await results.enqueue(outcome);
        await expect(results.enqueue({ ...outcome, winner: 1 })).rejects.toThrow("result_conflict");
        expect((await store.view(owner)).score).toEqual([1, 0]);
        expect(results.hasPending(game.gameId)).toBe(true);
      }
    } finally {
      await results.close();
      rmSync(isolated, { recursive: true, force: true });
    }
  },
);
