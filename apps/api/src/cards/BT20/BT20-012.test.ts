import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-012.js";

describe("BT20-012 Ginryumon", () => {
  it("optionally digivolves from hand while attacking and carries both alternate requirements", () => {
    expect(compiled.effects.find((entry) => !entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      actions: [{
        kind: "Digivolve",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        into: { nameOrTrait: [{ tokens: ["Hisyaryumon"], match: "name" }, { tokens: ["Chronicle"], match: "trait" }] },
        from: ["hand"],
        optional: true,
      }],
    });
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({ trigger: "YourTurn", actions: [{ kind: "ModifyDP", amount: 2000 }] });
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Ryudamon"], cost: 2, isAlternate: true },
      { level: 3, traits: ["Chronicle"], cost: 2, isAlternate: true },
    ]);
  });
});
