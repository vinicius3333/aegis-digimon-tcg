import { randomUUID } from "node:crypto";
import {
  closeSync,
  chmodSync,
  constants,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  opendirSync,
  readSync,
  renameSync,
  unlinkSync,
  writeFileSync,
  type Dir,
  type Stats,
} from "node:fs";
import { join } from "node:path";
import type { AccountStore } from "#api/accounts/AccountStore";
import { logError } from "#api/logger";
import type { PrivateSealedResult } from "#api/rooms/sealed/PrivateSealedResult";
import { PrivateSealedStore } from "#api/rooms/sealed/PrivateSealedStore";

type QuarantineParams = { gameId: string; source: Stats };
type Params = {
  accounts: AccountStore;
  directory: string;
  automatic?: boolean;
  persist?: (result: PrivateSealedResult) => Promise<void>;
};
const batchSize = 16;
const intervalMs = 5000;
const gameIdPattern = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;

export class PrivateSealedResults {
  readonly directory: string;
  private readonly pending = new Map<string, PrivateSealedResult>();
  private readonly flights = new Map<string, Promise<void>>();
  private readonly persist: (result: PrivateSealedResult) => Promise<void>;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private scan: Dir | undefined;
  private running: Promise<void> | undefined;
  private stopped = false;

  constructor({ accounts, directory, automatic = true, persist }: Params) {
    this.directory = directory;
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    const store = new PrivateSealedStore(accounts);
    this.persist = persist ?? ((result) => store.recordResult(result));
    if (automatic) {
      this.schedule(0);
    }
  }

  enqueue(input: PrivateSealedResult): Promise<void> {
    if (this.stopped) {
      return Promise.reject(new Error("result_worker_closed"));
    }
    this.validate(input);
    const existing = this.pending.get(input.gameId) ?? this.read(input.gameId);
    if (existing && (existing.roomId !== input.roomId || existing.winner !== input.winner)) {
      return Promise.reject(new Error("result_conflict"));
    }
    const result = existing ?? { ...input };
    this.pending.set(result.gameId, result);
    this.write(result);
    return this.flush(result.gameId);
  }

  hasPending(gameId: string): boolean {
    this.getPath(gameId);
    return this.pending.has(gameId) || this.read(gameId) !== undefined;
  }

  flush(gameId: string): Promise<void> {
    const current = this.flights.get(gameId);
    if (current) {
      return current;
    }
    const result = this.pending.get(gameId) ?? this.read(gameId);
    if (!result) {
      return Promise.resolve();
    }
    this.pending.set(gameId, result);
    const flight = Promise.resolve()
      .then(() => this.persistOne(result))
      .finally(() => {
        this.flights.delete(gameId);
      });
    this.flights.set(gameId, flight);
    return flight;
  }

  runOnce(): Promise<void> {
    if (this.running) {
      return this.running;
    }
    if (this.stopped) {
      return Promise.resolve();
    }
    this.running = Promise.resolve()
      .then(() => this.drain())
      .finally(() => {
        this.running = undefined;
      });
    return this.running;
  }

  async close(): Promise<void> {
    this.stopped = true;
    clearTimeout(this.timer);
    await this.running?.catch(() => undefined);
    await Promise.allSettled(this.flights.values());
    this.scan?.closeSync();
    this.scan = undefined;
  }

  private async persistOne(result: PrivateSealedResult): Promise<void> {
    this.write(result);
    await this.persist(result);
    try {
      unlinkSync(this.getPath(result.gameId));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
    this.syncDirectory();
    this.pending.delete(result.gameId);
  }

  private async drain(): Promise<void> {
    this.scan ??= opendirSync(this.directory);
    for (let count = 0; count < batchSize; count++) {
      const entry = this.scan.readSync();
      if (!entry) {
        this.scan.closeSync();
        this.scan = undefined;
        break;
      }
      if (!entry.isFile() || !entry.name.endsWith(".json")) {
        continue;
      }
      const id = entry.name.slice(0, -5);
      if (!gameIdPattern.test(id)) {
        continue;
      }
      if (this.pending.has(id)) {
        continue;
      }
      try {
        const record = this.read(id);
        if (record) {
          this.pending.set(id, record);
        }
      } catch {
        logError("[private sealed] result journal remains unreadable", { gameId: id });
      }
    }
    let failures = 0;
    for (const id of [...this.pending.keys()].slice(0, batchSize)) {
      try {
        await this.flush(id);
      } catch {
        const result = this.pending.get(id);
        this.pending.delete(id);
        if (result) {
          this.pending.set(id, result);
        }
        failures++;
      }
    }
    if (failures) {
      logError("[private sealed] authoritative results remain pending", { count: failures });
    }
  }

  private schedule(delay: number): void {
    if (this.stopped) {
      return;
    }
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.runOnce()
        .catch(() => logError("[private sealed] result journal reconciliation failed"))
        .finally(() => this.schedule(intervalMs));
    }, delay);
    this.timer.unref();
  }

  private getPath(gameId: string): string {
    if (!gameIdPattern.test(gameId)) {
      throw new Error("invalid_result_game");
    }
    return join(this.directory, `${gameId}.json`);
  }

  private read(gameId: string): PrivateSealedResult | undefined {
    const path = this.getPath(gameId);
    let bytes: Buffer;
    let source: Stats | undefined;
    let reading = false;
    let closed = true;
    try {
      source = lstatSync(path);
      if (!source.isFile()) {
        throw new Error("invalid_result_file");
      }
      reading = true;
      const file = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
      closed = false;
      try {
        reading = false;
        const info = fstatSync(file);
        if (!info.isFile() || info.dev !== source.dev || info.ino !== source.ino) {
          throw new Error("invalid_result_file");
        }
        bytes = Buffer.alloc(2049);
        let length = 0;
        reading = true;
        while (length < bytes.length) {
          const count = readSync(file, bytes, length, bytes.length - length, null);
          if (!count) {
            break;
          }
          length += count;
        }
        bytes = bytes.subarray(0, length);
        reading = false;
      } finally {
        closeSync(file);
        closed = true;
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        return undefined;
      }
      if (reading && closed && source && (code === "EACCES" || code === "EPERM")) {
        this.quarantine({ gameId, source });
        return undefined;
      }
      logError("[private sealed] result journal unreadable", { gameId });
      throw error;
    }
    try {
      if (bytes.length > 2048) {
        throw new Error("invalid_result_journal");
      }
      const result: PrivateSealedResult = JSON.parse(bytes.toString("utf8"));
      this.validate(result);
      if (result.gameId !== gameId) {
        throw new Error("invalid_result_journal");
      }
      return result;
    } catch {
      this.quarantine({ gameId, source });
      return undefined;
    }
  }

  private quarantine({ gameId, source }: QuarantineParams): void {
    const directory = join(this.directory, "quarantine");
    try {
      mkdirSync(directory, { recursive: true, mode: 0o700 });
      if (!lstatSync(directory).isDirectory()) {
        throw new Error("invalid_result_quarantine");
      }
      chmodSync(directory, 0o700);
      const scan = opendirSync(directory);
      try {
        for (let count = 0; count < 64; count++) {
          if (!scan.readSync()) {
            const path = this.getPath(gameId);
            const current = lstatSync(path);
            if (!current.isFile() || current.dev !== source.dev || current.ino !== source.ino) {
              throw new Error("invalid_result_file");
            }
            renameSync(path, join(directory, `${gameId}.${randomUUID()}.json`));
            this.syncDirectory(directory);
            this.syncDirectory();
            logError("[private sealed] corrupt result journal quarantined; reconcile database state", { gameId });
            return;
          }
        }
        throw new Error("result_quarantine_full");
      } finally {
        scan.closeSync();
      }
    } catch (error) {
      logError("[private sealed] result journal quarantine failed", { gameId });
      throw error;
    }
  }

  private validate(result: PrivateSealedResult): void {
    if (
      !result ||
      typeof result.gameId !== "string" ||
      !gameIdPattern.test(result.gameId) ||
      typeof result.roomId !== "string" ||
      result.roomId.length < 1 ||
      result.roomId.length > 200 ||
      ![0, 1, null].includes(result.winner) ||
      !Number.isSafeInteger(result.now) ||
      result.now < 0
    ) {
      throw new Error("invalid_result_journal");
    }
  }

  private write(result: PrivateSealedResult): void {
    const path = this.getPath(result.gameId);
    const temporary = `${path}.${randomUUID()}.tmp`;
    try {
      const file = openSync(temporary, "wx", 0o600);
      try {
        writeFileSync(file, JSON.stringify(result));
        fsyncSync(file);
      } finally {
        closeSync(file);
      }
      renameSync(temporary, path);
      this.syncDirectory();
    } catch (error) {
      try {
        unlinkSync(temporary);
      } catch {}
      throw error;
    }
  }

  private syncDirectory(path = this.directory): void {
    const directory = openSync(path, "r");
    try {
      fsyncSync(directory);
    } finally {
      closeSync(directory);
    }
  }
}
