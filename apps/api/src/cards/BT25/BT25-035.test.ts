import { describe, expect, it } from "vitest";
import { compiled as BT25_035 } from "./BT25-035.js";
import "../index.js";

describe("BT25-035 Cougarmon", () => {
  it("requires exactly two bottom face-down cards under Tamers for the optional digivolution", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_035.effects?.find((entry) => entry.trigger === trigger);
      const digivolve = effect?.actions?.[1] as { kind?: string; optional?: boolean; cost?: Record<string, unknown> };
      expect(digivolve.kind).toBe("Digivolve");
      expect(digivolve.optional).toBe(true);
      expect(digivolve.cost).toMatchObject({
        kind: "trashBottomFaceDownUnderTamer",
        controller: "mine",
        count: 2,
      });
    }
  });

  it("keeps the -3000 DP effect independent of the cost payment", () => {
    for (const effect of BT25_035.effects?.filter((entry) =>
      ["OnPlay", "WhenDigivolving"].includes(String(entry.trigger)),
    ) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "ModifyDP",
        amount: -3000,
        duration: "forTheTurn",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
    }
  });
});
