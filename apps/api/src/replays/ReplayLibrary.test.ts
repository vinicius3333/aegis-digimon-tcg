import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import { MAX_REPLAY_STORAGE_BYTES, MAX_SAVED_REPLAY_BYTES, type ReplayDownloadMessage } from "@aegis/shared";
import { AccountStore } from "../accounts/AccountStore.js";
import { createMemoryPool } from "../db/memoryPool.fixture.js";
import { ReplayLibrary } from "./ReplayLibrary.js";
import { installReplayRoutes } from "./routes.js";
import type { ReplayStorage } from "./storage.js";

export class MemoryReplayStorage implements ReplayStorage {
  readonly files = new Map<string, Buffer>();
  failWrite = false;
  failDelete = false;
  async put(key: string, bytes: Buffer): Promise<void> {
    this.files.set(key, Buffer.from(bytes));
    if (this.failWrite) throw new Error("ambiguous storage failure after PUT");
  }
  async get(key: string): Promise<Buffer> {
    const file = this.files.get(key);
    if (!file) throw new Error("missing object");
    return Buffer.from(file);
  }
  async remove(key: string): Promise<void> {
    if (this.failDelete) throw new Error("storage deletion failure");
    this.files.delete(key);
  }
}

function message(id = randomUUID()): Extract<ReplayDownloadMessage, { kind: "ready" }> {
  return {
    kind: "ready",
    data: Buffer.from("server-authoritative gzip bytes").toString("base64"),
    viewerSeat: 0,
    summary: {
      id,
      players: ["Agumon", "Gabumon"],
      mode: "casual",
      startedAt: 1,
      finishedAt: 2,
      winnerSeat: 0,
      frameCount: 2,
    },
  };
}
const accountsToClose: AccountStore[] = [];
const servers: Server[] = [];
afterEach(async () => {
  for (const server of servers.splice(0)) await new Promise<void>((resolve) => server.close(() => resolve()));
  for (const accounts of accountsToClose.splice(0)) await accounts.close();
});
async function setup() {
  const accounts = new AccountStore(createMemoryPool());
  accountsToClose.push(accounts);
  const owner = await accounts.accountForIdentity("email", `${randomUUID()}@test.invalid`, "Replay Player");
  const other = await accounts.accountForIdentity("email", `${randomUUID()}@test.invalid`, "Other Player");
  const storage = new MemoryReplayStorage();
  const library = new ReplayLibrary(accounts, storage);
  return { accounts, owner, other, storage, library };
}

describe("private account replay library", () => {
  it("retains ten slots, refuses an eleventh, and deduplicates retries even when full", async () => {
    const { accounts, owner, library } = await setup();
    const first = message();
    const saved = await library.save(owner.id, first);
    for (let index = 1; index < 10; index++) await library.save(owner.id, message());
    expect(await library.list(owner.id)).toHaveLength(10);
    await expect(library.save(owner.id, message())).rejects.toMatchObject({ code: "limit" });
    expect((await library.save(owner.id, first)).id).toBe(saved.id);
    const usage = await accounts.pool.query("SELECT bytes FROM replay_storage_usage");
    expect(Number(usage.rows[0].bytes)).toBe(10 * Buffer.from(first.data, "base64").length);
  });
  it("filters files and deletes by owner and recovers a slot only after object deletion", async () => {
    const { owner, other, storage, library } = await setup();
    const file = message();
    const saved = await library.save(owner.id, file);
    expect(await library.file(other.id, saved.id)).toBeUndefined();
    expect(await library.remove(other.id, saved.id)).toBe(false);
    expect(await library.list(other.id)).toEqual([]);
    expect((await library.file(owner.id, saved.id))?.bytes).toEqual(Buffer.from(file.data, "base64"));
    expect(await library.remove(owner.id, saved.id)).toBe(true);
    expect(storage.files.size).toBe(0);
    expect(await library.list(owner.id)).toEqual([]);
  });
  it("keeps an interrupted write recoverable with one reservation and stable object key", async () => {
    const { owner, storage, library } = await setup();
    const file = message();
    storage.failWrite = true;
    await expect(library.save(owner.id, file)).rejects.toThrow("storage failure");
    const pending = (await library.list(owner.id))[0]!;
    expect(pending.status).toBe("pending");
    expect(await library.file(owner.id, pending.id)).toBeUndefined();
    storage.failWrite = false;
    expect((await library.save(owner.id, file)).id).toBe(pending.id);
    expect(storage.files.size).toBe(1);
    expect((await library.list(owner.id))[0]!.status).toBe("ready");
  });
  it("keeps failed deletions reserved and retries them without deleting completed files", async () => {
    const { accounts, owner, storage, library } = await setup();
    const first = await library.save(owner.id, message());
    const keep = await library.save(owner.id, message());
    storage.failDelete = true;
    await expect(library.remove(owner.id, first.id)).rejects.toThrow("deletion failure");
    expect((await library.list(owner.id)).find((item) => item.id === first.id)?.status).toBe("deleting");
    storage.failDelete = false;
    await library.cleanup();
    expect((await library.list(owner.id)).map((item) => item.id)).toEqual([keep.id]);
    expect(Number((await accounts.pool.query("SELECT bytes FROM replay_storage_usage")).rows[0].bytes)).toBe(
      keep.bytes,
    );
  });
  it("reclaims only stale interrupted uploads and releases their global reservation", async () => {
    const { accounts, owner, storage, library } = await setup();
    storage.failWrite = true;
    await expect(library.save(owner.id, message())).rejects.toThrow("storage failure");
    await library.cleanup();
    expect(await library.list(owner.id)).toHaveLength(1);
    await library.cleanup(Date.now() + 25 * 60 * 60 * 1000);
    expect(await library.list(owner.id)).toEqual([]);
    expect(storage.files.size).toBe(0);
    expect(Number((await accounts.pool.query("SELECT bytes FROM replay_storage_usage")).rows[0].bytes)).toBe(0);
  });
  it("bounds compressed files and global storage before writing objects", async () => {
    const { accounts, owner, storage, library } = await setup();
    await expect(
      library.save(owner.id, { ...message(), data: Buffer.alloc(MAX_SAVED_REPLAY_BYTES + 1).toString("base64") }),
    ).rejects.toMatchObject({ code: "size" });
    await accounts.pool.query("UPDATE replay_storage_usage SET bytes=$1 WHERE id=1", [MAX_REPLAY_STORAGE_BYTES]);
    await expect(library.save(owner.id, message())).rejects.toMatchObject({ code: "storage_full" });
    expect(storage.files.size).toBe(0);
    expect(await library.list(owner.id)).toEqual([]);
  });
  it("rejects changed content for the same match and detects corrupted stored bytes", async () => {
    const { owner, storage, library } = await setup();
    const file = message();
    const saved = await library.save(owner.id, file);
    await expect(
      library.save(owner.id, { ...file, data: Buffer.from("modified").toString("base64") }),
    ).rejects.toMatchObject({ code: "unavailable" });
    storage.files.set([...storage.files.keys()][0]!, Buffer.from("corrupted"));
    await expect(library.file(owner.id, saved.id)).rejects.toThrow("integrity");
  });
  it("requires authentication on every endpoint and never exposes another owner's replay", async () => {
    const { accounts, owner, other, library } = await setup();
    const saved = await library.save(owner.id, message());
    const ownerSession = await accounts.issueSession(owner);
    const otherSession = await accounts.issueSession(other);
    const app = express();
    installReplayRoutes({ app, library, session: (req) => accounts.session(req.headers.cookie?.split("=")[1]) });
    const server = createServer(app);
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as { port: number };
    const base = `http://127.0.0.1:${address.port}`;
    for (const [path, method] of [
      ["/account/replays", "GET"],
      [`/account/replays/${saved.id}/file`, "GET"],
      [`/account/replays/${saved.id}`, "DELETE"],
    ]) {
      expect((await fetch(base + path, { method })).status).toBe(401);
    }
    const foreign = { headers: { Cookie: `aegis_session=${otherSession.id}` } };
    expect((await fetch(`${base}/account/replays/${saved.id}/file`, foreign)).status).toBe(404);
    expect((await fetch(`${base}/account/replays/${saved.id}`, { ...foreign, method: "DELETE" })).status).toBe(404);
    const response = await fetch(`${base}/account/replays/${saved.id}/file`, {
      headers: { Cookie: `aegis_session=${ownerSession.id}` },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("Content-Type")).toContain("application/gzip");
    const list = (await (
      await fetch(`${base}/account/replays`, { headers: { Cookie: `aegis_session=${ownerSession.id}` } })
    ).json()) as { limit: number; replays: unknown[] };
    expect(list.limit).toBe(10);
    expect(list.replays).toHaveLength(1);
  });
});
