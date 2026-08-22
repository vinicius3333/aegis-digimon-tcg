import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-029.js";
import "../index.js";

describe("BT20-029 Pulsemon", () => {
  it("covers the printed alternate evolution requirements and both clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Bibimon"], cost: 0, isAlternate: true },
      { level: 2, traits: ["SEEKERS"], cost: 0, isAlternate: true },
    ]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "YourTurn" });
    expect(compiled.effects[0]?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldDigivolve",
      sourceFilter: { isSelfRef: true },
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "OnBattleDeleteOpponent",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "GainMemory", amount: 1 }],
    });
  });
});
