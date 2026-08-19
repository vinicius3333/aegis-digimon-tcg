import { describe, expect, it } from "vitest";
import { compiled as BT25_023 } from "./BT25-023.js";
import "../index.js";

describe("BT25-023 Gaogamon", () => {
  it("plays one Thomas H. Norstein Tamer only with at most one Tamer in play", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_023.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "PlayWithoutCost",
        from: ["hand"],
        payCost: false,
        optional: true,
        target: {
          filter: { controller: "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["Thomas H. Norstein"], match: "trait" }] },
          count: 1,
        },
        condition: {
          kind: "permanentCount",
          filter: { controllerDefault: "mine", kind: ["Tamer"] },
          op: "lte",
          value: 1,
        },
      });
    }
  });

  it("draws one for both players once per turn when attacking", () => {
    const effect = BT25_023.effects?.find((entry) => entry.isInherited);
    expect(effect).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn" });
    expect(effect?.actions).toEqual([
      { kind: "Draw", amount: 1, controller: "mine" },
      { kind: "Draw", amount: 1, controller: "opponent" },
    ]);
  });
});
