import { randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  opendirSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
  type Dir,
} from "node:fs";
import { join } from "node:path";
import type { AccountStore } from "#api/accounts/AccountStore";
import { logError } from "#api/logger";
import type { PrivateSealedResult } from "#api/rooms/sealed/PrivateSealedResult";
import { PrivateSealedStore } from "#api/rooms/sealed/PrivateSealedStore";

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
    return this.pending.has(gameId) || existsSync(this.getPath(gameId));
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
    const flight = this.persistOne(result).finally(() => {
      this.flights.delete(gameId);
    });
    this.flights.set(gameId, flight);
    return flight;
  }

  runOnce(): Promise<void> {
    if (this.running) {
      return this.running;
    }
    this.running = this.drain().finally(() => {
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
      const record = this.read(id);
      if (record && !this.pending.has(id)) {
        this.pending.set(id, record);
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
    try {
      if (statSync(path).size > 2048) {
        throw new Error("invalid_result_journal");
      }
      const result: PrivateSealedResult = JSON.parse(readFileSync(path, "utf8"));
      this.validate(result);
      if (result.gameId !== gameId) {
        throw new Error("invalid_result_journal");
      }
      return result;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return undefined;
      }
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

  private syncDirectory(): void {
    const directory = openSync(this.directory, "r");
    try {
      fsyncSync(directory);
    } finally {
      closeSync(directory);
    }
  }
}
