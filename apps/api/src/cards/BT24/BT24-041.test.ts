import { describe, expect, it } from "vitest";
import { compiled as BT24_041 } from "./BT24-041.js";

describe("BT24-041 Minervamon", () => {
  it("shares the three entry triggers and scales De-Digivolve by your Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving", "OnDeletion"]) {
      const effect = BT24_041.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: false });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "DeDigivolve",
        amount: 1,
        scaling: { unit: "cards", per: 1 },
      });
    }
  });
  it("grants Iliad Digimon Reboot and Blocker during the opponent turn", () => {
    const effect = BT24_041.effects?.find((entry) => entry.trigger === "OpponentsTurn");
    expect(effect?.actions).toHaveLength(2);
    expect(effect?.actions?.map((action: any) => action.keyword?.keyword)).toEqual(["Reboot", "Blocker"]);
  });
});
