import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-032.js";

describe("EX10-032 Proganomon", () => {
  it("proves hand digivolution, shared buffs, inherited De-Digivolve, and the runtime residual", () => {
    expect(compiled.coverage).toBe("partial");
    expect(compiled.residual).toEqual(["DigivolveViaPlacement runtime execution is unsupported"]);
    expect(compiled.effects?.find((effect) => effect.trigger === "Main")).toMatchObject({
      isFromHand: true,
      condition: { kind: "youHave" },
      actions: [{ kind: "DigivolveViaPlacement", cost: 3, ignoreDigivolutionRequirements: true }],
    });

    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "GainKeyword", keyword: { keyword: "Collision" }, target: { bindAs: "chosen" } },
          { kind: "GainKeyword", target: { fromSelectionRef: "chosen" }, keyword: { keyword: "Piercing" } },
          { kind: "ModifyDP", target: { fromSelectionRef: "chosen" }, amount: 3000 },
        ],
      });
    }

    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      actions: [
        { kind: "SubTrigger", event: "onDigivolutionCardDiscarded", actions: [{ kind: "DeDigivolve", amount: 1 }] },
      ],
    });
  });
});
