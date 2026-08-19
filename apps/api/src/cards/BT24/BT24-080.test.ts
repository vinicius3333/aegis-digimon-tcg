import { describe, expect, it } from "vitest";
import { compiled as BT24_080 } from "./BT24-080.js";
import "../index.js";

describe("BT24-080 Megidramon", () => {
  it("digivolves into this trash card from Dark Dragon/Evil Dragon and keeps lowest-level deletion", () => {
    const trash = BT24_080.effects?.find((entry) => entry.trigger === "EndOfYourTurn");
    expect(trash).toMatchObject({ isFromTrash: true });
    expect(trash?.actions?.[0]).toMatchObject({
      kind: "Digivolve",
      into: { controller: "mine", zone: "trash", isSelfRef: true, kind: ["Digimon"] },
      from: ["trash"],
      condition: { kind: "zoneCount", zone: "hand", op: "lte", value: 4 },
    });
    for (const trigger of ["OnPlay", "WhenDigivolving", "OnDeletion"]) {
      expect(BT24_080.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { superlative: "lowestLevel" }, count: "all" },
      });
    }
  });
});
