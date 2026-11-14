import { randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Server } from "node:http";
import express from "express";
import { LocalDriver, LocalPresence, matchMaker } from "colyseus";
import { Pool } from "pg";
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { AccountStore } from "#api/accounts/AccountStore";
import { PrivateSealedStore } from "#api/rooms/sealed/PrivateSealedStore";
import { PrivateSealedResults } from "#api/rooms/sealed/PrivateSealedResults";
import type { PrivateSealedResult } from "#api/rooms/sealed/PrivateSealedResult";
import { getPrivateSealedResults } from "#api/rooms/sealed/getPrivateSealedResults";
import { installPrivateSealedRoutes } from "#api/rooms/sealed/installPrivateSealedRoutes";
import { getCardDefinition } from "@aegis/shared/cards/registry";
import { CardKind } from "@aegis/shared/schema/enums";
import type { PrivateSealedView } from "@aegis/shared/sealed/private/PrivateSealedContracts";

const connectionString = process.env.SEALED_TEST_DATABASE_URL;
if (!connectionString?.startsWith("postgres://postgres@127.0.0.1:55439/")) {
  throw new Error("Use isolated Postgres 55439");
}
const schema = `private_unreadable_${randomUUID().replaceAll("-", "")}`;
const admin = new Pool({ connectionString });
const pool = new Pool({ connectionString, options: `-c search_path=${schema}` });
const accounts = new AccountStore(pool);
const store = new PrivateSealedStore(accounts);
const directories: string[] = [];
const workers: PrivateSealedResults[] = [];
const servers: Server[] = [];
const nativeOpen = fs.openSync;
const nativeRead = fs.readSync;
const nativeRename = fs.renameSync;
const nativeLstat = fs.lstatSync;

beforeAll(async () => {
  await admin.query(`CREATE SCHEMA ${schema}`);
  await accounts.ensureReady();
  await matchMaker.setup(new LocalPresence(), new LocalDriver());
});
afterEach(async () => {
  vi.restoreAllMocks();
  syncBuiltinESMExports();
  await Promise.all(workers.splice(0).map((worker) => worker.close()));
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
          server.closeAllConnections();
        }),
    ),
  );
  for (const directory of directories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
afterAll(async () => {
  await pool.end();
  await admin.query(`DROP SCHEMA ${schema} CASCADE`);
  await admin.end();
});

function createWorker(persist: (result: PrivateSealedResult) => Promise<void> = async () => {}) {
  const directory = fs.mkdtempSync(join(tmpdir(), "sealed-unreadable-"));
  directories.push(directory);
  const worker = new PrivateSealedResults({ accounts, directory, automatic: false, persist });
  workers.push(worker);
  return { worker, directory };
}
function denyJournalRead({
  path,
  boundary,
  code = "EACCES",
}: {
  path: string;
  boundary: "open" | "read";
  code?: string;
}) {
  const denied = vi.fn<() => never>(() => {
    throw Object.assign(new Error(`injected ${boundary} ${code}`), { code });
  });
  let descriptor: number | undefined;
  vi.spyOn(fs, "openSync").mockImplementation((...args: Parameters<typeof fs.openSync>) => {
    if (
      args[0] === path &&
      fs.existsSync(path) &&
      typeof args[1] === "number" &&
      (args[1] & fs.constants.O_NOFOLLOW) !== 0
    ) {
      if (boundary === "open") {
        return denied();
      }
      descriptor = nativeOpen(...args);
      return descriptor;
    }
    return nativeOpen(...args);
  });
  vi.spyOn(fs, "readSync").mockImplementation(((...args: Parameters<typeof fs.readSync>) => {
    if (args[0] === descriptor) {
      descriptor = undefined;
      return denied();
    }
    return nativeRead(...args);
  }) as typeof fs.readSync);
  syncBuiltinESMExports();
  return denied;
}
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
async function createGame() {
  const credential = randomBytes(32).toString("hex");
  const guest = randomBytes(32).toString("hex");
  const now = Date.now();
  const created = await store.create({ credential, name: "Host", setId: "BT4", requestId: randomUUID(), now });
  const owner = { code: created.code, credential, now };
  const joined = await store.join({ ...owner, credential: guest, name: "Guest" });
  const unlocked = await store.view(owner);
  await store.ready({ ...owner, ...chooseDeck(unlocked) });
  await store.ready({ ...owner, credential: guest, ...chooseDeck(joined) });
  const game = await store.start({ ...owner, createRoom: async () => randomUUID(), roomExists: async () => true });
  return { owner, unlocked, outcome: { gameId: game.gameId, roomId: game.roomId, winner: 0 as const, now } };
}
async function startRoutes(resultsAccounts: AccountStore) {
  const app = express();
  app.use(express.json());
  installPrivateSealedRoutes({ app, accounts: resultsAccounts });
  const server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  servers.push(server);
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("missing_test_address");
  }
  return `http://127.0.0.1:${address.port}`;
}

it.each([
  { boundary: "open" as const, recorded: false },
  { boundary: "read" as const, recorded: false },
  { boundary: "open" as const, recorded: true },
  { boundary: "read" as const, recorded: true },
])(
  "POST cancel reconciles real DB after mocked $boundary EACCES (receipt: $recorded)",
  async ({ boundary, recorded }) => {
    const { owner, unlocked, outcome } = await createGame();
    if (recorded) {
      await store.recordResult(outcome);
    }
    const routeAccounts = new AccountStore(pool);
    const results = getPrivateSealedResults({ accounts: routeAccounts });
    await results.close();
    directories.push(results.directory);
    const base = await startRoutes(routeAccounts);
    const path = join(results.directory, `${outcome.gameId}.json`);
    const bytes = JSON.stringify({ ...outcome, winner: 1 });
    fs.writeFileSync(path, bytes);
    expect(fs.lstatSync(path).isFile()).toBe(true);
    const denied = denyJournalRead({ path, boundary });
    const response = await fetch(`${base}/private-sealed/${owner.code}/cancel`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: `aegis_private_sealed=${owner.credential}` },
      body: "{}",
    });
    const body = await response.json();
    expect(denied).toHaveBeenCalledTimes(1);
    expect({ status: response.status, body }).toMatchObject({
      status: 200,
      body: { status: "cancelled", score: recorded ? [1, 0] : [0, 0] },
    });
    expect(results.hasPending(outcome.gameId)).toBe(false);
    const quarantine = join(results.directory, "quarantine");
    expect(fs.statSync(quarantine).mode & 0o777).toBe(0o700);
    const names = fs.readdirSync(quarantine);
    expect(names).toHaveLength(1);
    expect(fs.readFileSync(join(quarantine, names[0]!), "utf8")).toBe(bytes);
    expect((await store.view(owner)).pool.packs).toEqual(unlocked.pool.packs);
    expect((await store.getCurrentGame(owner))?.finishedAt).toBe(recorded ? outcome.now : null);
    expect(
      (
        await pool.query("SELECT room_id,winner,finished_at FROM private_sealed_results WHERE game_id=$1", [
          outcome.gameId,
        ])
      ).rows,
    ).toEqual(recorded ? [{ room_id: outcome.roomId, winner: 0, finished_at: String(outcome.now) }] : []);
  },
);

it.each(["open", "read"] as const)(
  "quarantines mocked %s EACCES and drains a healthy neighbor without inventing results",
  async (boundary) => {
    const persisted: PrivateSealedResult[] = [];
    const { worker, directory } = createWorker(async (result) => {
      persisted.push(result);
    });
    const bad = { gameId: randomUUID(), roomId: "bad", winner: 1 as const, now: 1000 };
    const good = { ...bad, gameId: randomUUID(), roomId: "healthy", winner: 0 as const };
    const path = join(directory, `${bad.gameId}.json`);
    fs.writeFileSync(path, JSON.stringify(bad));
    fs.writeFileSync(join(directory, `${good.gameId}.json`), JSON.stringify(good));
    const denied = denyJournalRead({ path, boundary });
    await worker.runOnce();
    expect(denied).toHaveBeenCalledTimes(1);
    expect(persisted).toEqual([good]);
    expect(worker.hasPending(bad.gameId)).toBe(false);
    expect(worker.hasPending(good.gameId)).toBe(false);
    expect(fs.readdirSync(join(directory, "quarantine"))).toHaveLength(1);
  },
);

it.each([false, true])(
  "POST cancel stays pending when unreadable quarantine is full (receipt: %s)",
  async (recorded) => {
    const { owner, outcome } = await createGame();
    if (recorded) {
      await store.recordResult(outcome);
    }
    const before = (await pool.query("SELECT state FROM private_sealed_series WHERE code=$1", [owner.code])).rows[0]
      .state;
    const routeAccounts = new AccountStore(pool);
    const results = getPrivateSealedResults({ accounts: routeAccounts });
    await results.close();
    directories.push(results.directory);
    const base = await startRoutes(routeAccounts);
    const path = join(results.directory, `${outcome.gameId}.json`);
    const bytes = JSON.stringify(outcome);
    fs.writeFileSync(path, bytes);
    const quarantine = join(results.directory, "quarantine");
    fs.mkdirSync(quarantine);
    for (let count = 0; count < 64; count++) {
      fs.writeFileSync(join(quarantine, `${count}.json`), "preserved");
    }
    denyJournalRead({ path, boundary: "open" });
    const response = await fetch(`${base}/private-sealed/${owner.code}/cancel`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: `aegis_private_sealed=${owner.credential}` },
      body: "{}",
    });
    expect({ status: response.status, body: await response.json() }).toEqual({
      status: 409,
      body: { error: "result_pending" },
    });
    expect(
      (await pool.query("SELECT state FROM private_sealed_series WHERE code=$1", [owner.code])).rows[0].state,
    ).toEqual(before);
    expect(fs.readFileSync(path, "utf8")).toBe(bytes);
    expect(fs.readdirSync(quarantine)).toHaveLength(64);
  },
);

it.each(["EIO", "EMFILE", "ENFILE"])("does not quarantine unrelated mocked open %s failures", (code) => {
  const { worker, directory } = createWorker();
  const gameId = randomUUID();
  const path = join(directory, `${gameId}.json`);
  fs.writeFileSync(path, "preserved");
  denyJournalRead({ path, boundary: "open", code });
  expect(() => worker.flush(gameId)).toThrow(`injected open ${code}`);
  expect(fs.readFileSync(path, "utf8")).toBe("preserved");
  expect(fs.existsSync(join(directory, "quarantine"))).toBe(false);
});

it.each(["symlink", "directory"])("rejects an unreadable %s instead of moving it to quarantine", (kind) => {
  const { worker, directory } = createWorker();
  const gameId = randomUUID();
  const path = join(directory, `${gameId}.json`);
  const target = join(directory, "protected-target");
  fs.writeFileSync(target, "preserved");
  if (kind === "symlink") {
    fs.symlinkSync(target, path);
  } else {
    fs.mkdirSync(path);
  }
  denyJournalRead({ path, boundary: "open" });
  expect(() => worker.flush(gameId)).toThrow();
  expect(fs.lstatSync(path).isSymbolicLink()).toBe(kind === "symlink");
  expect(fs.readFileSync(target, "utf8")).toBe("preserved");
  expect(fs.existsSync(join(directory, "quarantine"))).toBe(false);
});

it("preserves an unreadable source when mocked metadata denial prevents regular-file verification", () => {
  const { worker, directory } = createWorker();
  const gameId = randomUUID();
  const path = join(directory, `${gameId}.json`);
  fs.writeFileSync(path, "preserved");
  vi.spyOn(fs, "lstatSync").mockImplementation(((...args: Parameters<typeof fs.lstatSync>) => {
    if (args[0] === path) {
      throw Object.assign(new Error("metadata denied"), { code: "EACCES" });
    }
    return nativeLstat(...args);
  }) as typeof fs.lstatSync);
  denyJournalRead({ path, boundary: "open" });
  expect(() => worker.flush(gameId)).toThrow();
  expect(fs.readFileSync(path, "utf8")).toBe("preserved");
  expect(fs.existsSync(join(directory, "quarantine"))).toBe(false);
});

it.each(["full", "rename", "symlink"])(
  "fails closed on mocked EACCES with %s quarantine while draining healthy pending memory",
  async (failure) => {
    const persisted: PrivateSealedResult[] = [];
    let available = false;
    const { worker, directory } = createWorker(async (result) => {
      if (!available) {
        throw new Error("database unavailable");
      }
      persisted.push(result);
    });
    const good = { gameId: randomUUID(), roomId: "healthy", winner: 0 as const, now: 1000 };
    await expect(worker.enqueue(good)).rejects.toThrow("database unavailable");
    const bad = { ...good, gameId: randomUUID(), roomId: "unreadable", winner: 1 as const };
    const path = join(directory, `${bad.gameId}.json`);
    fs.writeFileSync(path, JSON.stringify(bad));
    const quarantine = join(directory, "quarantine");
    if (failure === "symlink") {
      fs.symlinkSync(directory, quarantine);
    } else {
      fs.mkdirSync(quarantine);
    }
    if (failure === "full") {
      for (let count = 0; count < 64; count++) {
        fs.writeFileSync(join(quarantine, `${count}.json`), "preserved");
      }
    }
    if (failure === "rename") {
      vi.spyOn(fs, "renameSync").mockImplementation((source, destination) => {
        if (source === path) {
          throw Object.assign(new Error("rename denied"), { code: "EACCES" });
        }
        return nativeRename(source, destination);
      });
    }
    denyJournalRead({ path, boundary: "open" });
    expect(() => worker.flush(bad.gameId)).toThrow();
    expect(fs.readFileSync(path, "utf8")).toBe(JSON.stringify(bad));
    available = true;
    await worker.runOnce();
    expect(persisted).toEqual([good]);
    expect(worker.hasPending(good.gameId)).toBe(false);
    expect(fs.readFileSync(path, "utf8")).toBe(JSON.stringify(bad));
    if (failure === "full") {
      expect(fs.readdirSync(quarantine)).toHaveLength(64);
    }
  },
);

it("uses authoritative pending memory without reading an unreadable replacement or quarantining it", async () => {
  const persisted: PrivateSealedResult[] = [];
  let available = false;
  const { worker, directory } = createWorker(async (result) => {
    if (!available) {
      throw new Error("database unavailable");
    }
    persisted.push(result);
  });
  const result = { gameId: randomUUID(), roomId: "authoritative", winner: 0 as const, now: 1000 };
  await expect(worker.enqueue(result)).rejects.toThrow("database unavailable");
  const path = join(directory, `${result.gameId}.json`);
  fs.writeFileSync(path, JSON.stringify({ ...result, winner: 1 }));
  fs.writeFileSync(join(directory, "quarantine"), "blocked");
  const denied = denyJournalRead({ path, boundary: "open" });
  expect(worker.hasPending(result.gameId)).toBe(true);
  available = true;
  await worker.runOnce();
  expect(denied).not.toHaveBeenCalled();
  expect(persisted).toEqual([result]);
  expect(worker.hasPending(result.gameId)).toBe(false);
  expect(fs.readFileSync(join(directory, "quarantine"), "utf8")).toBe("blocked");
});

it.each(["regular", "symlink"])("refuses a %s source replacement between unreadable open and quarantine", (kind) => {
  const { worker, directory } = createWorker();
  const gameId = randomUUID();
  const path = join(directory, `${gameId}.json`);
  const original = join(directory, "original");
  const replacement = join(directory, "replacement");
  fs.writeFileSync(path, "unreadable original");
  fs.writeFileSync(replacement, "protected replacement");
  vi.spyOn(fs, "openSync").mockImplementation((...args: Parameters<typeof fs.openSync>) => {
    if (args[0] === path) {
      nativeRename(path, original);
      if (kind === "regular") {
        nativeRename(replacement, path);
      } else {
        fs.symlinkSync(replacement, path);
      }
      throw Object.assign(new Error("injected open EACCES"), { code: "EACCES" });
    }
    return nativeOpen(...args);
  });
  syncBuiltinESMExports();
  expect(() => worker.flush(gameId)).toThrow("invalid_result_file");
  expect(fs.readFileSync(original, "utf8")).toBe("unreadable original");
  expect(fs.readFileSync(path, "utf8")).toBe("protected replacement");
  expect(fs.readdirSync(join(directory, "quarantine"))).toEqual([]);
});

it("rejects an opened descriptor whose inode differs from the no-follow source snapshot", () => {
  const { worker, directory } = createWorker();
  const gameId = randomUUID();
  const path = join(directory, `${gameId}.json`);
  const replacement = join(directory, "replacement");
  fs.writeFileSync(path, "original");
  fs.writeFileSync(replacement, "replacement");
  vi.spyOn(fs, "openSync").mockImplementation((...args: Parameters<typeof fs.openSync>) => {
    if (args[0] === path) {
      nativeRename(replacement, path);
    }
    return nativeOpen(...args);
  });
  syncBuiltinESMExports();
  expect(() => worker.flush(gameId)).toThrow("invalid_result_file");
  expect(fs.readFileSync(path, "utf8")).toBe("replacement");
  expect(fs.existsSync(join(directory, "quarantine"))).toBe(false);
});
