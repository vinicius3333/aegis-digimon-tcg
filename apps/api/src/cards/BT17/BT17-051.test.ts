import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-051.js";

describe("BT17-051 Argomon", () => {
  it("deletes any number of opposing Digimon by level budget, scaling from Argomon sources", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)?.actions[1]).toMatchObject({ kind: "DeleteLevelBudget", filter: { controller: "opponent", kind: ["Digimon"], hasLevel: true }, baseBudget: 4, upTo: true, scaling: { per: 2, budgetAdd: 1, unit: "digivolutionCards" } });
    }
  });

  it("prevents opposing Tamers from unsuspending during the opponent's turn", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "OpponentsTurn")?.actions[0]).toMatchObject({ kind: "Restrict", target: { filter: { controller: "opponent", kind: ["Tamer"] }, count: "all" }, restriction: "unsuspend", duration: "untilOpponentTurnEnd" });
  });
});
