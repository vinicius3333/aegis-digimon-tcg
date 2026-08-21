import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-054.js";

describe("EX10-054 VenomMyotismon", () => {
  it("proves trash-main cost reduction, independent target choices, mandatory restriction tail, and deletion", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.find((effect) => effect.trigger === "Main")).toMatchObject({
      isFromTrash: true,
      actions: [{ kind: "Replacement", event: "wouldBePlayed", mode: "reduceCost", amount: 7, cost: { kind: "deleteOwn", target: { filter: { controller: "mine", kind: ["Digimon"], levels: [5] }, count: 1 } }, optional: true, abortOnDecline: true }],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 2 }, optional: true },
          { kind: "Restrict", target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 2 }, restriction: "unsuspend", duration: "untilOpponentTurnEnd" },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "OnDeletion")).toMatchObject({ actions: [{ kind: "Delete", target: { filter: { controller: "opponent", suspended: true, kind: ["Digimon"] }, count: 1 } }] });
  });
});
