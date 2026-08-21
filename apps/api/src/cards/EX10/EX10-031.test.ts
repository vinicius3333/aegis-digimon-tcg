import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-031.js";

describe("EX10-031 DarkKnightmon", () => {
  it("proves shared target protection/DP, leave replacement, inherited redirect, and DigiXros", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digiXrosRequirement).toEqual([{ materials: [{ names: ["SkullKnightmon"] }, { names: ["DeadlyAxemon"] }], count: 1 }]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({ actions: [
        { kind: "GrantStatic", selectionRef: "protected", grant: { kind: "Protection", protections: ["deDigivolve"], from: "opponent" }, duration: "untilOpponentTurnEnd", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 } },
        { kind: "ModifyDP", fromSelectionRef: "protected", amount: 3000, duration: "untilOpponentTurnEnd" },
      ] });
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "AllTurns" && !effect.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Replacement", event: "wouldLeavePlay", actions: [{ kind: "PlayWithoutCost", from: ["digivolutionCards"], payCost: false, target: { filter: { controller: "mine", kind: ["Digimon", "Tamer", "Option"], playCostLte: 4 }, count: 1 } }] }] });
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({ trigger: "OpponentsTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenOpponentAttacks", actions: [{ kind: "RedirectAttack", optional: true, target: { filter: { isSelfRef: true }, count: 1, isSelf: true } }] }] });
  });
});
