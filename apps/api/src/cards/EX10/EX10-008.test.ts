import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-008.js";

describe("EX10-008 MetalGreymon", () => {
  it("grants the same opponent target Collision and a start-main-phase attack", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, names: ["Greymon"], cost: 3, isAlternate: true }]);

    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({ actions: [
        { kind: "GainKeyword", keyword: { keyword: "Collision" }, duration: "untilOpponentTurnEnd", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } },
        { kind: "GainTriggeredEffect", gainedTrigger: "StartOfYourMainPhase", duration: "untilOpponentTurnEnd", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1, sameTarget: true }, gainedActions: [{ kind: "Attack" }] },
      ] });
    }
  });

  it("models the inherited once-per-turn target-switch security trash and name gate", () => {
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "OpponentsTurn",
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenAttackTargetSwitched", actions: [{
        kind: "Trash",
        target: { filter: { controller: "opponent" }, count: 1 },
        condition: { kind: "selfHasNameContaining", names: ["Greymon"] },
      }] }],
    });
  });
});
