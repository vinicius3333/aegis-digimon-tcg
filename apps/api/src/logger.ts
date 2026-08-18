import { appendFileSync, mkdirSync } from "node:fs";
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
 * The synchronous `appendFileSync` per line is a second cost, and it fills `logs/api.log`
 * with test noise. ERROR still reaches stderr so a genuine failure remains visible.
 */
const UNDER_TEST = process.env.VITEST !== undefined || process.env.NODE_ENV === "test";

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
  // appendFileSync is intentional: survives uncaught exceptions where async writes may not flush
  appendFileSync(logFile, line);
}

export const log = (...args: unknown[]) => write("INFO", ...args);
export const logError = (...args: unknown[]) => write("ERROR", ...args);
