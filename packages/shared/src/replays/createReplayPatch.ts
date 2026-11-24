import type { ReplayPatch } from "#shared/replays/ReplayPatch";

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const jsonValue = (value: unknown) => (value === undefined ? null : value);

export function createReplayPatch(previous: unknown, next: unknown): ReplayPatch | undefined {
  if (previous === next) return undefined;
  if (isRecord(previous) && isRecord(next)) return objectPatch(previous, next);
  if (Array.isArray(previous) && Array.isArray(next)) return arrayPatch(previous, next);
  return { r: jsonValue(next) };
}

function objectPatch(previous: JsonRecord, next: JsonRecord): ReplayPatch | undefined {
  const changed: Record<string, ReplayPatch> = {};
  let changes = 0;
  for (const key of Object.keys(next)) {
    const value = next[key];
    if (value === undefined) continue;
    const patch = previous[key] === undefined ? { r: value } : createReplayPatch(previous[key], value);
    if (patch === undefined) continue;
    changed[key] = patch;
    changes += 1;
  }
  const deleted = Object.keys(previous).filter((key) => previous[key] !== undefined && next[key] === undefined);
  if (changes === 0 && deleted.length === 0) return undefined;
  return deleted.length > 0 ? { o: changed, d: deleted } : { o: changed };
}

function arrayPatch(previous: readonly unknown[], next: readonly unknown[]): ReplayPatch | undefined {
  const changed: Record<string, ReplayPatch> = {};
  let changes = 0;
  for (let index = 0; index < next.length; index += 1) {
    const patch =
      index < previous.length ? createReplayPatch(previous[index], next[index]) : { r: jsonValue(next[index]) };
    if (patch === undefined) continue;
    changed[index] = patch;
    changes += 1;
  }
  if (changes === 0 && previous.length === next.length) return undefined;
  if (changes * 2 > next.length) return { r: next.map(jsonValue) };
  return { a: changed, n: next.length };
}
