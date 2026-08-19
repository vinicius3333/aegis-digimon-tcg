import { describe, expect, it } from "vitest";
import { compiled as BT24_035 } from "./BT24-035.js";

describe("BT24-035 Gatomon", () => {
  it("applies -3000 DP and conditionally offers Silphymon DNA digivolution", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = BT24_035.effects?.find((entry) => entry.trigger === trigger)?.actions ?? [];
      expect(actions[0]).toMatchObject({ kind: "ModifyDP", amount: -3000, duration: "forTheTurn" });
      expect(actions[1]).toMatchObject({
        kind: "DnaDigivolve",
        payCost: true,
        optional: true,
        condition: { kind: "isYourTurn" },
        into: { nameOrTrait: [{ tokens: ["Silphymon"], match: "name" }] },
      });
    }
    expect(BT24_035.effects?.find((entry) => entry.isInherited)?.keywords?.[0]?.keyword).toBe("Barrier");
  });
});
