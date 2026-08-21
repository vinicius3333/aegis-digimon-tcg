import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-022.js";

describe("EX10-022 Belphemon: Rage Mode", () => {
  it("verifies both start-main effects, the six-card buff, and conditional top-stack trash", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Belphemon: Sleep Mode"], cost: 1, isAlternate: true }]);
    expect(compiled.effects?.find((effect) => effect.trigger === "StartOfYourMainPhase" && effect.actions[0]?.kind === "Suspend")).toMatchObject({ actions: [
      { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } }, count: "all" } },
      { kind: "GainKeyword", keyword: { keyword: "Piercing" }, duration: "forTheTurn", condition: { kind: "zoneCount", seat: "mine", zone: "hand", op: "lte", value: 6 } },
      { kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 2 }, duration: "forTheTurn" },
      { kind: "ModifyDP", amount: 3000, duration: "forTheTurn" },
    ] });
    for (const trigger of ["StartOfYourMainPhase", "OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger && effect.actions[0]?.kind === "Delete")).toMatchObject({ actions: [{ kind: "Delete", target: { filter: { controller: "opponent", suspended: true, kind: ["Digimon", "Tamer"] }, count: 1 } }] });
    }
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({ trigger: "EndOfOpponentsTurn", actions: [{ kind: "TrashDigivolution", amount: 1, fromTop: true, condition: { kind: "selfTopHasText" } }] });
  });
});
