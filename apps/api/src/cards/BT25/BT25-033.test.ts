import { describe, expect, it } from "vitest";
import { compiled as BT25_033 } from "./BT25-033.js";
import "../index.js";

describe("BT25-033 Aegiomon", () => {
  it("requires adding your top security card before the -5000 DP effect", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_033.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "ModifyDP",
        amount: -5000,
        duration: "forTheTurn",
        optional: true,
        abortOnDecline: true,
        cost: {
          kind: "securityToHand",
          controller: "mine",
          amount: 1,
        },
      });
    }
  });

  it("targets one opponent Digimon and preserves both Barrier keywords", () => {
    expect(BT25_033.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Barrier" }] });
    expect(BT25_033.effects?.[3]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Barrier" }],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_033.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
    }
  });
});
