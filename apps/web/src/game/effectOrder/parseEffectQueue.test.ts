import { describe, expect, it } from "vitest";
import type { EffectQueueEntry } from "@aegis/shared/protocol/EffectQueueEntry";
import { parseEffectQueue } from "@/game/effectOrder/parseEffectQueue";

const entries: EffectQueueEntry[] = [
  { seat: 0, position: 1, isResolving: true, sourceCardId: "BT3-092", sourcePermanentId: "malo" },
  { seat: 1, position: 2, lastPosition: 3 },
  { seat: 1, position: 2, lastPosition: 3, sourcePermanentId: "other" },
];

describe("parseEffectQueue", () => {
  it("reads the synchronized queue and keeps the same entries while the field is unchanged", () => {
    const json = JSON.stringify(entries);
    const first = parseEffectQueue(json);

    expect(first).toEqual(entries);
    expect(parseEffectQueue(json)).toBe(first);
  });

  it("shows nothing for an empty, missing or malformed queue", () => {
    expect(parseEffectQueue("[]")).toEqual([]);
    expect(parseEffectQueue(undefined)).toEqual([]);
    expect(parseEffectQueue("{")).toEqual([]);
    expect(parseEffectQueue(JSON.stringify([{ seat: 2, position: 1 }]))).toEqual([]);
  });
});
