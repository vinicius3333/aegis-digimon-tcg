import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-041.js";

describe("EX10-041 Wizardmon", () => {
  it("proves effect-only deck/security trash triggers and opponent-turn DP duration", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, traits: ["Evil"], cost: 2, isAlternate: true },
    ]);
    expect(compiled.effects?.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      actions: [{ kind: "SubTrigger", event: "whenTrashedFromDeck", byEffect: true, sourceFilter: { isSelfRef: true } }],
    });
    expect(compiled.effects?.find((effect) => effect.trigger === "OnDiscardSecurity")).toMatchObject({
      actions: [{ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 }, duration: "untilOpponentTurnEnd" }],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "SecurityManipulation", op: "trashTop", controller: "mine", amount: 1, cost: true },
          { kind: "TrashTopDeck", controller: "mine", amount: 2 },
          { kind: "ModifyDP", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" }, amount: -3000, duration: "untilOpponentTurnEnd" },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({ keywords: [{ keyword: "Barrier" }] });
  });
});
