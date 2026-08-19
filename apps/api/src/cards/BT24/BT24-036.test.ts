import { describe, expect, it } from "vitest";
import { compiled as BT24_036 } from "./BT24-036.js";

describe("BT24-036 Medicmon", () => {
  it("plays from security without battle and applies -3000 DP on entry/deletion", () => {
    expect(BT24_036.effects?.find((entry) => entry.trigger === "Security")?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
    });
    for (const trigger of ["OnPlay", "OnDeletion"]) {
      expect(BT24_036.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
        kind: "ModifyDP",
        amount: -3000,
        duration: "forTheTurn",
      });
    }
  });
});
