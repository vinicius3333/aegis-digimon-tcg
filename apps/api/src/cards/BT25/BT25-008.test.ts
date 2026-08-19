import { describe, expect, it } from "vitest";
import { compiled as BT25_008 } from "./BT25-008.js";
import "../index.js";

describe("BT25-008 Coronamon", () => {
  it("draws one for each actually trashed Iliad/TS hand card", () => {
    for (const trigger of ["WhenMoving", "OnPlay"] as const) {
      const effect = BT25_008.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "Draw",
        controller: "mine",
        amount: 1,
        optional: true,
        abortOnDecline: true,
        cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine", nameOrTrait: [{ tokens: ["Iliad", "TS"], match: "trait" }] }, count: 2, upTo: true } },
        scaling: { per: 1, usePaidCount: true },
      });
    }
  });

  it("preserves inherited +2000 DP during your turn", () => {
    expect(BT25_008.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "YourTurn", actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }] });
  });
});
