import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-022.js";

describe("BT20-022 Crabmon (X Antibody)", () => {
  it("protects one of your Digimon from battle deletion on entry and draws at the inherited hand boundary", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({ actions: [{ kind: "Restrict", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 }, restriction: "beDeletedInBattle", duration: "untilOpponentTurnEnd" }] });
    }
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [{ kind: "Draw", controller: "mine", amount: 1, condition: { kind: "zoneCount", seat: "mine", zone: "hand", op: "lte", value: 7 } }] });
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Crabmon"], cost: 0, isAlternate: true }]);
  });
});
