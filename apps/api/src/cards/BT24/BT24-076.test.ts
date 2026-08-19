import { describe, expect, it } from "vitest";
import { compiled as BT24_076 } from "./BT24-076.js";
import "../index.js";

describe("BT24-076 WarGrowlmon", () => {
  it("keeps the trash Main cost reduction and level restrictions", () => {
    const trash = BT24_076.effects?.find((entry) => entry.trigger === "Main");
    expect(trash).toMatchObject({ isFromTrash: true });
    expect(trash?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: true,
      reduceCost: 2,
      condition: { kind: "zoneCount", zone: "hand", op: "lte", value: 4 },
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(BT24_076.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { levelComparison: { op: "lte", value: 4 } }, count: 1 },
      });
    }
  });
});
