import { randomUUID } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import type { AccountStore } from "#api/accounts/AccountStore";
import type { PrivateSealedResult } from "#api/rooms/sealed/PrivateSealedResult";
import { PrivateSealedResults } from "#api/rooms/sealed/PrivateSealedResults";

const directories: string[] = [];
const workers: PrivateSealedResults[] = [];
afterEach(async () => {
  await Promise.all(workers.splice(0).map((worker) => worker.close()));
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});
function createWorker(persist: (result: PrivateSealedResult) => Promise<void> = async () => {}) {
  const directory = mkdtempSync(join(tmpdir(), "sealed-journal-recovery-"));
  directories.push(directory);
  const worker = new PrivateSealedResults({ accounts: {} as AccountStore, directory, automatic: false, persist });
  workers.push(worker);
  return { worker, directory };
}
function createResult(): PrivateSealedResult {
  return { gameId: randomUUID(), roomId: "engine-room", winner: 0, now: 1000 };
}
it.each(["{", JSON.stringify({ winner: 1 }), "x".repeat(2049)])(
  "quarantines unreadable journal bytes and releases DB reconciliation: %s",
  async (bytes) => {
    const persisted: PrivateSealedResult[] = [];
    const { worker, directory } = createWorker(async (result) => {
      persisted.push(result);
    });
    const corrupt = createResult();
    const good = createResult();
    writeFileSync(join(directory, `${corrupt.gameId}.json`), bytes);
    writeFileSync(join(directory, `${good.gameId}.json`), JSON.stringify(good));
    await expect(worker.flush(corrupt.gameId)).resolves.toBeUndefined();
    expect(worker.hasPending(corrupt.gameId)).toBe(false);
    await worker.runOnce();
    expect(persisted).toEqual([good]);
    expect(worker.hasPending(good.gameId)).toBe(false);
    const quarantine = join(directory, "quarantine");
    expect(statSync(quarantine).mode & 0o777).toBe(0o700);
    const names = readdirSync(quarantine);
    expect(names).toHaveLength(1);
    expect(readFileSync(join(quarantine, names[0]!), "utf8")).toBe(bytes);
  },
);
it("scan quarantines a mismatched game ID without touching the healthy journal it names", async () => {
  const persisted: PrivateSealedResult[] = [];
  const { worker, directory } = createWorker(async (result) => {
    persisted.push(result);
  });
  const corrupt = createResult();
  const good = createResult();
  writeFileSync(join(directory, `${corrupt.gameId}.json`), JSON.stringify(good));
  writeFileSync(join(directory, `${good.gameId}.json`), JSON.stringify(good));
  writeFileSync(join(directory, "invalid-name.json"), "{");
  await worker.runOnce();
  expect(persisted).toEqual([good]);
  expect(worker.hasPending(corrupt.gameId)).toBe(false);
  expect(readFileSync(join(directory, "invalid-name.json"), "utf8")).toBe("{");
  expect(readdirSync(join(directory, "quarantine"))).toHaveLength(1);
});
it("pending lookup quarantines corruption instead of reporting permanent result pending", () => {
  const { worker, directory } = createWorker();
  const result = createResult();
  writeFileSync(join(directory, `${result.gameId}.json`), "{");
  expect(worker.hasPending(result.gameId)).toBe(false);
});
it("failed journal replacement preserves authoritative memory until retry succeeds", async () => {
  const persisted: PrivateSealedResult[] = [];
  let available = false;
  const { worker, directory } = createWorker(async (result) => {
    if (!available) {
      throw new Error("database unavailable");
    }
    persisted.push(result);
  });
  const result = createResult();
  await expect(worker.enqueue(result)).rejects.toThrow("database unavailable");
  rmSync(join(directory, `${result.gameId}.json`));
  mkdirSync(join(directory, `${result.gameId}.json`));
  available = true;
  await expect(worker.flush(result.gameId)).rejects.toThrow();
  expect(worker.hasPending(result.gameId)).toBe(true);
  expect(persisted).toEqual([]);
  rmSync(join(directory, `${result.gameId}.json`), { recursive: true });
  await worker.flush(result.gameId);
  expect(persisted).toEqual([result]);
  expect(worker.hasPending(result.gameId)).toBe(false);
});
it("isolates failed quarantine IO from unrelated queued series without losing the bad file", async () => {
  const persisted: PrivateSealedResult[] = [];
  const { worker, directory } = createWorker(async (result) => {
    persisted.push(result);
  });
  const corrupt = createResult();
  const good = createResult();
  writeFileSync(join(directory, `${corrupt.gameId}.json`), "{");
  writeFileSync(join(directory, "quarantine"), "blocked directory");
  writeFileSync(join(directory, `${good.gameId}.json`), JSON.stringify(good));
  expect(() => worker.flush(corrupt.gameId)).toThrow();
  expect(readFileSync(join(directory, `${corrupt.gameId}.json`), "utf8")).toBe("{");
  await expect(worker.runOnce()).resolves.toBeUndefined();
  expect(persisted).toEqual([good]);
  rmSync(join(directory, "quarantine"));
  await worker.flush(corrupt.gameId);
  expect(worker.hasPending(corrupt.gameId)).toBe(false);
});
it("retains authoritative memory over corrupt disk bytes even when quarantine is unavailable", async () => {
  let available = false;
  const persisted: PrivateSealedResult[] = [];
  const { worker, directory } = createWorker(async (result) => {
    if (!available) {
      throw new Error("database unavailable");
    }
    persisted.push(result);
  });
  const result = createResult();
  await expect(worker.enqueue(result)).rejects.toThrow("database unavailable");
  writeFileSync(join(directory, `${result.gameId}.json`), "{");
  writeFileSync(join(directory, "quarantine"), "blocked directory");
  expect(worker.hasPending(result.gameId)).toBe(true);
  available = true;
  await worker.runOnce();
  expect(persisted).toEqual([result]);
  expect(worker.hasPending(result.gameId)).toBe(false);
});
it("shares the same persistence flight during synchronous retry and drain reentry", async () => {
  let attempts = 0;
  let nested: Promise<void> | undefined;
  let nestedRun: Promise<void> | undefined;
  const { worker, directory } = createWorker(async (result) => {
    attempts++;
    if (attempts === 1) {
      nested = worker.flush(result.gameId);
      nestedRun = worker.runOnce();
    }
  });
  const result = createResult();
  writeFileSync(join(directory, `${result.gameId}.json`), JSON.stringify(result));
  const running = worker.runOnce();
  await running;
  expect(nestedRun).toBe(running);
  await nested;
  expect(attempts).toBe(1);
});
it("bounds quarantine retention without deleting a healthy neighboring journal", async () => {
  const { worker, directory } = createWorker();
  const result = createResult();
  mkdirSync(join(directory, "quarantine"));
  for (let count = 0; count < 64; count++) {
    writeFileSync(join(directory, "quarantine", `${count}.json`), "preserved");
  }
  writeFileSync(join(directory, `${result.gameId}.json`), "{");
  expect(() => worker.flush(result.gameId)).toThrow("result_quarantine_full");
  expect(readFileSync(join(directory, `${result.gameId}.json`), "utf8")).toBe("{");
  expect(readdirSync(join(directory, "quarantine"))).toHaveLength(64);
});
it("rejects traversal and does not follow journal or quarantine symlinks", async () => {
  const { worker, directory } = createWorker();
  expect(() => worker.flush("../outside")).toThrow("invalid_result_game");
  expect(() => worker.hasPending("../outside")).toThrow("invalid_result_game");
  const result = createResult();
  const target = join(directory, "untouched");
  writeFileSync(target, "private bytes");
  symlinkSync(target, join(directory, `${result.gameId}.json`));
  expect(() => worker.flush(result.gameId)).toThrow();
  rmSync(join(directory, `${result.gameId}.json`));
  writeFileSync(join(directory, `${result.gameId}.json`), "{");
  symlinkSync(directory, join(directory, "quarantine"));
  expect(() => worker.flush(result.gameId)).toThrow("invalid_result_quarantine");
  expect(readFileSync(target, "utf8")).toBe("private bytes");
});
it("close waits for the active drain and prevents restart or new authoritative writes", async () => {
  let release: (() => void) | undefined;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  const { worker, directory } = createWorker(async () => waiting);
  const result = createResult();
  writeFileSync(join(directory, `${result.gameId}.json`), JSON.stringify(result));
  const running = worker.runOnce();
  await Promise.resolve();
  const closing = worker.close();
  let closed = false;
  void closing.then(() => {
    closed = true;
  });
  await Promise.resolve();
  expect(closed).toBe(false);
  release!();
  await Promise.all([running, closing, worker.close()]);
  await expect(worker.enqueue(createResult())).rejects.toThrow("result_worker_closed");
  const untouched = createResult();
  writeFileSync(join(directory, `${untouched.gameId}.json`), JSON.stringify(untouched));
  await worker.runOnce();
  expect(worker.hasPending(untouched.gameId)).toBe(true);
});
it("preserves idempotent pending duplicates and rejects conflicting winners or rooms", async () => {
  const result = createResult();
  let attempts = 0;
  const { worker, directory } = createWorker(async () => {
    attempts++;
    throw new Error("result_conflict");
  });
  await expect(worker.enqueue(result)).rejects.toThrow("result_conflict");
  await expect(worker.enqueue({ ...result, now: 2000 })).rejects.toThrow("result_conflict");
  expect(attempts).toBe(2);
  await expect(worker.enqueue({ ...result, winner: 1 })).rejects.toThrow("result_conflict");
  await expect(worker.enqueue({ ...result, roomId: "wrong-room" })).rejects.toThrow("result_conflict");
  expect(attempts).toBe(2);
  expect(worker.hasPending(result.gameId)).toBe(true);
  expect(JSON.parse(readFileSync(join(directory, `${result.gameId}.json`), "utf8"))).toEqual(result);
});
