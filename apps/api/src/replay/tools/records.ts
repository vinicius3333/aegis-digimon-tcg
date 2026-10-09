import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { REPLAY_FORMAT, type ReplayRecord } from "../types.js";

/** A file or payload that is not a usable replay record; the message says why, for the user. */
export class ReplayRecordError extends Error {
  override name = "ReplayRecordError";
}

/**
 * Check the shape a replay needs before the engine sees it. It is a structural check, not a full
 * schema: a record from a newer format, a bug report's raw body or an unrelated JSON file fails
 * here with a clear message instead of deep inside the engine.
 */
export function asReplayRecord(value: unknown, source: string): ReplayRecord {
  const fail = (why: string): never => {
    throw new ReplayRecordError(`${source} is not a replay record: ${why}.`);
  };
  if (typeof value !== "object" || value === null || Array.isArray(value)) return fail("not a JSON object");
  const record = value as Record<string, unknown>;
  if (record.format !== REPLAY_FORMAT)
    return fail(`format is ${JSON.stringify(record.format)}, this tool reads "${REPLAY_FORMAT}"`);
  if (typeof record.seed !== "number") fail("no numeric seed");
  if (!Array.isArray(record.seats) || record.seats.length !== 2) fail("seats is not a pair");
  if (!Array.isArray(record.inputs)) fail("no inputs array");
  for (const [index, input] of (record.inputs as unknown[]).entries()) {
    if (typeof input !== "object" || input === null || typeof (input as { kind?: unknown }).kind !== "string")
      fail(`input #${index} has no kind`);
  }
  return value as ReplayRecord;
}

export function readRecord(path: string): ReplayRecord {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    throw new ReplayRecordError(`Cannot read ${path}: ${(error as Error).message}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new ReplayRecordError(`${path} is not valid JSON: ${(error as Error).message}`);
  }
  return asReplayRecord(parsed, path);
}

/** Write JSON in the repository's format (Oxfmt), creating the directory. */
export function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, formatJson(value) + "\n");
}

/** The record with only the inputs up to and including `lastInput`: what a fixture needs, no more. */
export function trimRecord(record: ReplayRecord, lastInput: number): ReplayRecord {
  return { ...record, inputs: record.inputs.slice(0, lastInput + 1) };
}

const PRINT_WIDTH = 120;

/**
 * `JSON.stringify(value, null, 2)` as Oxfmt (Prettier) prints JSON, so a committed fixture passes
 * `pnpm format:check` without a reformat: objects stay expanded one key per line, and an array of
 * primitives collapses onto one line when it fits in the print width (including the trailing comma).
 */
export function formatJson(value: unknown): string {
  return print(value, "", "", "");
}

function print(value: unknown, indent: string, prefix: string, suffix: string): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    if (value.every((item) => item === null || typeof item !== "object")) {
      const flat = `[${value.map((item) => JSON.stringify(item)).join(", ")}]`;
      if (indent.length + prefix.length + flat.length + suffix.length <= PRINT_WIDTH) return flat;
    }
    const inner = indent + "  ";
    const lines = value.map((item, index) => {
      const comma = index < value.length - 1 ? "," : "";
      return inner + print(item, inner, "", comma) + comma;
    });
    return `[\n${lines.join("\n")}\n${indent}]`;
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value).filter(([, item]) => item !== undefined);
    if (entries.length === 0) return "{}";
    const inner = indent + "  ";
    const lines = entries.map(([key, item], index) => {
      const comma = index < entries.length - 1 ? "," : "";
      const keyText = `${JSON.stringify(key)}: `;
      return inner + keyText + print(item, inner, keyText, comma) + comma;
    });
    return `{\n${lines.join("\n")}\n${indent}}`;
  }
  return JSON.stringify(value) ?? "null";
}
