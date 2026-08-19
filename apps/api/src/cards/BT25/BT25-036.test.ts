import { describe, expect, it } from "vitest";
import { compiled as BT25_036 } from "./BT25-036.js";
import "../index.js";

describe("BT25-036 Craftmon", () => {
  it("adds the top security card, then performs Recovery +1", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_036.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions).toHaveLength(2);
      expect(effect?.actions?.[0]).toMatchObject({ kind: "SecurityManipulation", op: "toHand", controller: "mine", amount: 1, toTop: true });
      expect(effect?.actions?.[1]).toMatchObject({ kind: "SecurityManipulation", op: "addTop", controller: "mine", source: "deck", amount: 1 });
    }
  });

  it("uses the four-name App Fusion pool as a two-distinct-name requirement", () => {
    expect(BT25_036.appFusionRequirement).toEqual([{ names: ["Kabemon", "Gomimon", "Ecomon", "Puzzlemon"], cost: 0 }]);
    expect(BT25_036.effects?.find((entry) => entry.trigger === "Security")?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
    });
  });
});
