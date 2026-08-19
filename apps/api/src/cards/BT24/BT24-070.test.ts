import { describe, expect, it } from "vitest";
import { compiled as BT24_070 } from "./BT24-070.js";
import "../index.js";

describe("BT24-070 Growlmon", () => {
  it("plays a qualifying purple Tamer from trash under the hand-size gate", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(BT24_070.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
        kind: "PlayWithoutCost",
        from: ["trash"],
        target: { filter: { kind: ["Tamer"], colors: ["Purple"], playCostLte: 4 } },
        condition: { kind: "zoneCount", zone: "hand", op: "lte", value: 4 },
      });
    }
    expect(BT24_070.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions?.[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { levels: [3] }, count: 1 },
    });
  });
});
