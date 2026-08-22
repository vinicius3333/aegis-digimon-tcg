import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-027.js";

describe("BT26-027 Petermon", () => {
  it("models both printed timing windows, suspension cost, and inherited Barrier", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["WG"], cost: 2 }]);
    expect(compiled.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "OnPlay", actions: [expect.objectContaining({
        kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -2 }, duration: "untilOpponentTurnEnd",
        cost: { kind: "suspend", target: { filter: expect.objectContaining({ controllerDefault: "mine", kind: ["Digimon"] }), count: 1 } },
      })] }),
      expect.objectContaining({ trigger: "StartOfOpponentsMainPhase" }),
      expect.objectContaining({ trigger: "Static", isInherited: true, keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }] }),
    ]));
  });
});
