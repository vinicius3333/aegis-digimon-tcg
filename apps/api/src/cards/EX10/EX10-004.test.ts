import { describe, expect, it } from "vitest";
import compiled from "./EX10-004.js";

describe("EX10-004 Cupimon compiled contract", () => {
  it("models the inherited Lucemon breeding move effect and shared hand-trash cost", () => {
    const effect = compiled.effects?.[0];
    const move = effect?.actions?.[0];
    expect(effect).toMatchObject({ trigger: "YourTurn", isInherited: true, frequency: "OncePerTurn" });
    expect(move).toMatchObject({
      kind: "SubTrigger",
      event: "whenMovedFromBreeding",
      sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Lucemon"], match: "name" }] },
    });
    expect(move.actions).toEqual([
      expect.objectContaining({ kind: "Draw", amount: 1, cost: expect.objectContaining({ kind: "trash" }) }),
      expect.objectContaining({
        kind: "GainMemory",
        amount: 1,
        condition: { kind: "ifThisEffectActed", raw: "if you did" },
      }),
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
});
