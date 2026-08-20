import { createWriteStream, mkdirSync, type WriteStream } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "logs");
mkdirSync(dir, { recursive: true });
const logFile = join(dir, "api.log");

/**
 * Under test, INFO is dropped and nothing is written to the log file.
 *
 * Vitest captures each test's stdout and retains it for the reporter, so the engine's INFO
 * stream — a few lines per resolution, across ~7,000 tests — grows until the run dies with
 * "Ineffective mark-compacts near heap limit". The suite still passed; only the process
 * exit code was lost, which is worse than it sounds: a green run reported red. Raising the
 * heap to 8 GB did not help, because the retention is unbounded rather than merely large.
 * ERROR still reaches stderr so a genuine failure remains visible.
 */
const UNDER_TEST = process.env.VITEST !== undefined || process.env.NODE_ENV === "test";

/**
 * The log file is written through a buffered append stream, not `appendFileSync`.
 *
 * The synchronous append blocked the event loop once per line, and the loop is shared by every
 * match in the process: one room's log write delayed every other room's next action. The stream
 * keeps the ordering (a single stream, written in call order) and drops the syscall off the hot
 * path. `flushLogs` exists for the shutdown path, where an async write may otherwise be lost.
 */
let stream: WriteStream | undefined;

function fileStream(): WriteStream {
  stream ??= createWriteStream(logFile, { flags: "a" });
  return stream;
}

function write(level: "INFO" | "ERROR", ...args: unknown[]): void {
  if (UNDER_TEST && level !== "ERROR") return;
  const parts = args.map((a) => {
    if (a instanceof Error) {
      return `${a.message}\n${a.stack ?? "(no stack)"}`;
    }
    return String(a);
  });
  const line = `${new Date().toISOString()} [${level}] ${parts.join(" ")}\n`;
  process[level === "ERROR" ? "stderr" : "stdout"].write(line);
  if (UNDER_TEST) return;
  fileStream().write(line);
}

export const log = (...args: unknown[]) => write("INFO", ...args);
export const logError = (...args: unknown[]) => write("ERROR", ...args);

/** Flush and close the log file. Call on graceful shutdown so buffered lines reach disk. */
export function flushLogs(): Promise<void> {
  const open = stream;
  stream = undefined;
  if (open === undefined) return Promise.resolve();
  return new Promise((resolve) => open.end(resolve));
}
