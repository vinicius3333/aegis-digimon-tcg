import { describe, expect, it } from "vitest";
import compiled from "./EX10-015.js";

describe("EX10-015 Psychemon compiled contract", () => {
  it("preserves Save cost, deletion placement, inherited Piercing, and DigiXros", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "OnDeletion", actions: [expect.objectContaining({ kind: "PlaceUnder", optional: true, underFilter: { controller: "mine", kind: ["Tamer"] } })] }),
      expect.objectContaining({ trigger: "StartOfYourMainPhase", actions: [
        expect.objectContaining({ kind: "Draw", amount: 1, cost: expect.objectContaining({ kind: "trash" }) }),
        expect.objectContaining({ kind: "Suspend", condition: { kind: "ifThisEffectActed", raw: "if you did" } }),
      ] }),
      expect.objectContaining({ trigger: "YourTurn", isInherited: true, actions: [expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Piercing" } })] }),
    ]));
    expect(compiled.digiXrosRequirement).toEqual([{ materials: [{ kind: ["Digimon"], textContains: "Save" }], count: 1, costReduction: 2 }]);
  });
});
