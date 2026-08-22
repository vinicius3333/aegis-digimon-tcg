import { describe, expect, it } from "vitest";
import { compiled } from "./BT24-007.js";

describe("BT24-007 Tsunomon", () => {
  it("plays one level 4+ Demon/Titan Digimon from trash with a 2-cost reduction", () => {
    const effect = compiled.effects[0]!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(effect).toMatchObject({ trigger: "YourTurn", isInherited: true, frequency: "OncePerTurn" });
    expect(effect.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenHandTrashed",
      fireCondition: { kind: "triggerHandTrashedSeat", seat: "mine" },
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: true,
          reduceCostBy: 2,
          optional: true,
          target: {
            filter: {
              controller: "mine",
              zone: "trash",
              kind: ["Digimon"],
              levelComparison: { op: "gte", value: 4 },
              nameOrTrait: [
                { tokens: ["Demon"], match: "trait" },
                { tokens: ["Titan"], match: "trait" },
              ],
            },
            count: 1,
          },
        },
      ],
    });
  });
});
