import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-010.js";

describe("BT20-010 Ryudamon", () => {
  it("reduces qualifying digivolutions only from the battle area and grants inherited DP", () => {
    const main = compiled.effects.find((entry) => !entry.isInherited);
    expect(main).toMatchObject({ trigger: "YourTurn" });
    expect(main?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldDigivolve",
      sourceFilter: { isSelfRef: true, zone: "battleArea" },
      into: {
        nameOrTrait: [
          { tokens: ["Ginryumon"], match: "name" },
          { tokens: ["Chronicle"], match: "trait" },
        ],
      },
      actions: [{ kind: "Replacement", mode: "reduceCost", amount: 1 }],
    });
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 2, colors: ["Black"], traits: ["X Antibody"], cost: 0, isAlternate: true },
    ]);
  });
});
