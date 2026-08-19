import { describe, expect, it } from "vitest";
import { compiled as BT24_072 } from "./BT24-072.js";
import "../index.js";

describe("BT24-072 SkullGreymon", () => {
  it("requires the hand-trash cost before granting both keywords", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = BT24_072.effects?.find((entry) => entry.trigger === trigger)?.actions ?? [];
      expect(actions[0]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "Blocker" },
        cost: { kind: "trash", target: { filter: { zone: "hand" } } },
      });
      expect(actions[0]).not.toHaveProperty("optional");
      expect(actions[1]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "Retaliation" },
        target: { sameTarget: true },
      });
    }
  });
});
