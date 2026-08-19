import { describe, expect, it } from "vitest";
import { compiled as BT24_034 } from "./BT24-034.js";

describe("BT24-034 Aegiomon", () => {
  it("uses the executable top-security-to-hand cost for all three entry timings", () => {
    for (const trigger of ["WhenMoving", "OnPlay", "WhenDigivolving"]) {
      const action = BT24_034.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0] as any;
      expect(action).toMatchObject({
        kind: "PlayWithoutCost",
        from: ["hand"],
        payCost: false,
        optional: true,
        cost: { kind: "securityToHand" },
      });
    }
  });
  it("keeps Barrier as both normal and inherited keyword", () => {
    expect(BT24_034.effects?.filter((entry) => entry.keywords?.[0]?.keyword === "Barrier")).toHaveLength(2);
  });
});
