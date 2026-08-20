import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-069.js";

describe("BT15-069", () => {
  it("draws when the opponent has 1 or less memory, otherwise gains 1 memory", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ kind: "Draw", amount: 1, condition: { kind: "memoryAtMost", controller: "opponent", value: 1 } });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({ kind: "GainMemory", amount: 1, condition: { kind: "memoryAtLeast", controller: "opponent", value: 1 } });
  });
});
