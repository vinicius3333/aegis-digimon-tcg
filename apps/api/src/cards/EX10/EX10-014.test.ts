import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-014.js";

describe("EX10-014 VenomMyotismon", () => {
  it("models security play and both opponent Digimon Security Attack debuffs", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.find((effect) => effect.trigger === "Security")).toMatchObject({ actions: [{ kind: "PlayWithoutCost", payCost: false, target: { filter: { isSelfRef: true }, count: 1, isSelf: true } }] });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({ actions: [{
        kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 }, duration: "untilOpponentTurnEnd",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 2 },
      }] });
    }
  });
});
