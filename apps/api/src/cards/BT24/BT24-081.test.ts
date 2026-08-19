import { describe, expect, it } from "vitest";
import { compiled as BT24_081 } from "./BT24-081.js";
import "../index.js";

describe("BT24-081 Titamon + SkullBaluchimon", () => {
  it("requires the printed hand-trash cost and separates Titamon from the level-limited Titan branch", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      const action = BT24_081.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0];
      expect(action).toMatchObject({
        kind: "Delete",
        target: { filter: { superlative: "lowestLevel" }, count: "all" },
        cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" } } },
      });
      expect(action).not.toHaveProperty("optional");
    }
    const deletion = BT24_081.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0];
    expect(deletion).toMatchObject({
      kind: "PlayWithoutCost",
      target: {
        filter: { nameOrTrait: [{ tokens: ["Titamon"], match: "name" }] },
        orFilters: [{ levelComparison: { op: "lte", value: 5 }, nameOrTrait: [{ tokens: ["Titan"], match: "trait" }] }],
      },
      from: ["trash"],
    });
  });
});
