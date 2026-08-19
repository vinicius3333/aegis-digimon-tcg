import { describe, expect, it } from "vitest";
import { compiled as BT24_038 } from "./BT24-038.js";

describe("BT24-038 Biomon", () => {
  it("links a level-4-or-lower Digimon from hand or this stack to itself", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = BT24_038.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0] as any;
      expect(action).toMatchObject({ kind: "Link", from: ["hand", "digivolutionCards"], optional: true });
      expect(action.target.filter.levelComparison).toEqual({ op: "lte", value: 4 });
      expect(action.recipient).toMatchObject({ filter: { isSelfRef: true }, count: 1, isSelf: true });
    }
  });
});
