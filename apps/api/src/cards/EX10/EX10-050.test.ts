import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-050.js";

describe("EX10-050 Baalmon", () => {
  it("proves trash thresholds, deletion Beelzemon play, inherited DP scaling, and alternate evolution", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["Wizard"], cost: 3, isAlternate: true }]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "TrashTopDeck", controller: "mine", amount: 3 },
          { kind: "GainKeyword", keyword: { keyword: "Reboot" }, condition: { kind: "zoneCount", seat: "mine", zone: "trash", op: "gte", value: 5 }, duration: "untilOpponentTurnEnd" },
          { kind: "GainKeyword", keyword: { keyword: "Blocker" }, condition: { kind: "zoneCount", seat: "mine", zone: "trash", op: "gte", value: 5 }, duration: "untilOpponentTurnEnd" },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "OnDeletion")).toMatchObject({ actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true, condition: { kind: "zoneCount", seat: "mine", zone: "trash", op: "gte", value: 10 }, target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Beelzemon"], match: "name" }] }, count: 1 } }] });
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({ actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent", scaling: { per: 10, unit: "trash" } }] });
  });
});
