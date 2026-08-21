import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-066.js";

describe("BT20-066 Stingmon", () => {
  it("deletes one opposing level 3 Digimon on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)?.actions[0]).toMatchObject({ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], levels: [3] }, count: 1 } });
    }
  });

  it("optionally DNA digivolves two own Digimon into a qualifying card from hand during its turn", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({ actions: [{ kind: "Delete" }, { kind: "DnaDigivolve", materials: { filter: { controller: "mine", kind: ["Digimon"] }, count: 2 }, into: { zone: "hand", nameOrTrait: [{ tokens: ["Imperialdramon"], match: "name" }, { tokens: ["Free"], match: "trait" }] }, payCost: true, condition: { kind: "isYourTurn" }, optional: true }] });
    }
  });

  it("inherits Retaliation", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Retaliation" }] });
  });
});
