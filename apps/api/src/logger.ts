import { AsyncLocalStorage } from "node:async_hooks";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createErrorAlerts, resendDelivery } from "./errorAlerts.js";
import { LocalLogWriter } from "./localLogWriter.js";

const UNDER_TEST = process.env.VITEST !== undefined || process.env.NODE_ENV === "test";
export const logDirectory = process.env.AEGIS_LOG_DIR ?? join(dirname(fileURLToPath(import.meta.url)), "..", "logs");
const configuredMaxBytes = Number(process.env.AEGIS_LOG_MAX_BYTES);
export const logMaxBytes =
  Number.isSafeInteger(configuredMaxBytes) && configuredMaxBytes > 0 ? configuredMaxBytes : 64 * 1024 * 1024;
const context = new AsyncLocalStorage<{ matchId: string; roomId: string }>();
const writer = UNDER_TEST ? undefined : new LocalLogWriter(logDirectory, logMaxBytes);

function configureErrorAlerts() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AEGIS_EMAIL_FROM;
  const to = process.env.AEGIS_ALERT_EMAIL;
  if (UNDER_TEST || !apiKey || !from || !to) return undefined;
  return createErrorAlerts({ deliver: resendDelivery(apiKey, from, to) });
}
const errorAlerts = configureErrorAlerts();

export function withMatchLog<T>(matchId: string, roomId: string, action: () => T): T {
  return context.run({ matchId, roomId }, action);
}

export function serializeLog(value: unknown): string {
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(value, (_key, item) => {
      if (typeof item === "bigint") return String(item);
      if (item && typeof item === "object") {
        if (seen.has(item)) return "[Circular]";
        seen.add(item);
      }
      return item;
    });
  } catch (error) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      ...context.getStore(),
      level: "ERROR",
      data: ["Log serialization failed", String(error)],
    });
  }
}

function write(level: "INFO" | "ERROR", ...args: unknown[]): void {
  if (UNDER_TEST && level !== "ERROR") return;
  const line =
    serializeLog({
      timestamp: new Date().toISOString(),
      level,
      ...context.getStore(),
      data: args.map((value) => (value instanceof Error ? { message: value.message, stack: value.stack } : value)),
    }) + "\n";
  process[level === "ERROR" ? "stderr" : "stdout"].write(line);
  writer?.write(line);
  if (level === "ERROR") errorAlerts?.report(args, line);
}

export const log = (...args: unknown[]) => write("INFO", ...args);
export const logError = (...args: unknown[]) => write("ERROR", ...args);
export const flushLogs = async (): Promise<void> => {
  await errorAlerts?.flush();
  await writer?.close();
};
