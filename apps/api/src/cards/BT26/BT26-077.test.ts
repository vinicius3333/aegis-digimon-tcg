import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-077.js";

describe("BT26-077 compiled behavior", () => {
  it("proves the alternate evolution, intrinsic keywords, shared once-per-turn play, and highest-cost deletion", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, traits: ["DM"], cost: 3, isAlternate: true }]);
    expect(compiled.keywords).toEqual([
      expect.objectContaining({ keyword: "SecurityAttack", amount: 1 }),
      expect.objectContaining({ keyword: "Execute" }),
      expect.objectContaining({ keyword: "Fragment", amount: 2 }),
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "bt26-077-play-ver3",
        actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true, target: { filter: { playCostLte: 6, nameOrTrait: [{ tokens: ["Ver.3"], match: "trait" }] } } }],
      });
    }
    expect(compiled.effects.find((effect) => effect.trigger === "OnDeletion")).toMatchObject({ actions: [{ kind: "Delete", target: { count: 1, filter: { controller: "opponent", kind: ["Digimon", "Tamer"], superlative: "highestPlayCost" } } }] });
  });

  it("raises the printed play-cost ceiling only for each face-down card in this stack", () => {
    const action = compiled.effects.find((effect) => effect.trigger === "OnPlay")!.actions[0];
    expect(action.playCostCeiling).toEqual({ base: 6, raise: 1, per: 1, filter: {}, unit: "selfFaceDownDigivolutionCards" });
  });
});
