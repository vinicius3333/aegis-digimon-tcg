import { describe, expect, it } from "vitest";
import type { ServerEvent } from "@aegis/shared";
import { createEffectSequence } from "../effectSequence";
import { announcedBoardVersion } from "./presentBatch";

const triggered: ServerEvent = {
  kind: "effectTriggered",
  seat: 0,
  sourceCardId: "EX4-003",
  effectKey: "draw",
  description: "<Draw 1>.",
};
const drew: ServerEvent = { kind: "cardsMoved", from: "deck", to: "hand", instanceIds: ["a"], seat: 0 };

function boardFor(events: readonly ServerEvent[]) {
  const observed = createEffectSequence().observeBatch("batch-1", 13, events);
  return announcedBoardVersion(events, observed, 13);
}

describe("announcedBoardVersion", () => {
  it("holds a batch that announces an effect and carries its first result at the board before it", () => {
    expect(boardFor([triggered, drew])).toBe(12);
  });

  it("keeps a batch that only announces at its own board", () => {
    expect(boardFor([triggered])).toBe(13);
  });

  it("keeps a batch whose earlier results belong to the effect before it", () => {
    expect(boardFor([drew, triggered, drew])).toBe(13);
  });

  it("keeps a batch that announces nothing", () => {
    expect(boardFor([drew])).toBe(13);
  });
});
