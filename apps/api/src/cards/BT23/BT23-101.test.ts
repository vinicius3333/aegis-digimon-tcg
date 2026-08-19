import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-101.js";

describe("BT23-101 Hudiemon", () => {
  it("plays a low-cost CS card and applies the mandatory scaled DP reduction", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = compiled.effects.find((effect) => effect.trigger === trigger)?.actions as any[];
      expect(actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true });
      expect(actions[1]).toMatchObject({ kind: "ModifyDP", amount: -3000, duration: "forTheTurn" });
      expect(actions[1].optional).toBeUndefined();
      expect(actions[1].scaling.filter.nameOrTrait).toEqual([{ tokens: ["Hudie"], match: "trait" }]);
    }
  });

  it("reactivates the On Play effects with the printed CS Tamer return cost", () => {
    const action = compiled.effects.find((effect) => effect.trigger === "WhenAttacking")?.actions?.[0] as any;
    expect(action).toMatchObject({
      kind: "ReactivateEffect",
      fromTrigger: "OnPlay",
      count: 1,
      optional: true,
      cost: { kind: "return" },
    });
  });
});
