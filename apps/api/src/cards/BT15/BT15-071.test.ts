import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-071.js";

describe("BT15-071", () => {
  it("may trash a hand card to delete an opposing Digimon with 3000 DP or less and draws with SoC in stack", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ kind: "Delete", target: { filter: { dp: { op: "lte", value: 3000 } } }, cost: { kind: "trash" }, optional: true });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({ kind: "Draw", amount: 1, condition: { kind: "selfDigivolutionStackHasTrait" } });
  });
  it("gains 1 memory once per turn after attacking when the opponent has memory", () => expect(compiled.effects?.[1]).toMatchObject({ trigger: "EndOfAttack", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "memoryAtLeast" } }] }));
});
