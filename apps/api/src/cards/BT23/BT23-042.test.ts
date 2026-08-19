import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-042.js";

describe("BT23-042 Waspmon", () => {
  it("grants +1000 DP to all Royal Base Digimon in Security", () => {
    const security = compiled.effects.find((entry) => entry.trigger === "AllTurns" && entry.isSecurity) as any;
    expect(security).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }],
            },
            count: "all",
          },
          amount: 1000,
          duration: "permanent",
        },
      ],
    });
  });

  it("may play a Royal Base-in-text Tamer from hand when you have at most one Tamer", () => {
    const action = (compiled.effects.find((entry) => entry.trigger === "WhenDigivolving") as any).actions[0];
    expect(action).toMatchObject({
      kind: "PlayWithoutCost",
      target: {
        filter: { controller: "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["Royal Base"], match: "text" }] },
        count: 1,
      },
      from: ["hand"],
      payCost: false,
      condition: {
        kind: "permanentCount",
        op: "lte",
        value: 1,
        filter: { controllerDefault: "mine", kind: ["Tamer"] },
      },
      optional: true,
    });
    expect(compiled.effects.some((entry) => entry.isInherited)).toBe(false);
  });
});
