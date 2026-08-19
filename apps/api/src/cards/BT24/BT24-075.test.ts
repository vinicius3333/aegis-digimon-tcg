import { describe, expect, it } from "vitest";
import { compiled as BT24_075 } from "./BT24-075.js";
import "../index.js";

describe("BT24-075 SkullBaluchimon", () => {
  it("requires the hand-trash cost before deleting both level targets", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = BT24_075.effects?.find((entry) => entry.trigger === trigger)?.actions ?? [];
      expect(actions[0]).toMatchObject({
        kind: "Delete",
        cost: { kind: "trash", target: { filter: { zone: "hand" } } },
      });
      expect(actions[0]).not.toHaveProperty("optional");
      expect(actions[0]).toMatchObject({ target: { filter: { level: 3 }, count: 1 } });
      expect(actions[1]).toMatchObject({ kind: "Delete", target: { filter: { level: 4 }, count: 1 } });
    }
    const inherited = BT24_075.effects?.find((entry) => entry.trigger === "YourTurn");
    expect(inherited?.actions?.[0]).toMatchObject({ while: { kind: "anyOf" }, effect: { kind: "keyword" } });
  });
});
