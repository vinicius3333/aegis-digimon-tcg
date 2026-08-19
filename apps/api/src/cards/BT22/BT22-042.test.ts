import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-042.js";

describe("BT22-042 Nyabootmon", () => {
  it("plays a level 4-or-lower Puppet and scales the mandatory DP reduction", () => {
    const digivolving = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(digivolving?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      optional: true,
      target: {
        filter: { controller: "mine", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
        count: 1,
      },
    });
    expect(digivolving?.actions[1]).toMatchObject({
      kind: "ModifyDP",
      amount: -3000,
      optional: false,
      duration: "untilOpponentTurnEnd",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      scaling: { per: 1, unit: "cards", filter: { controller: "mine", kind: ["Digimon"] } },
    });
  });

  it("once per turn reactivates this Digimon's When Digivolving effect", () => {
    const allTurns = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(allTurns).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] },
          actions: [
            {
              kind: "ActivateEffect",
              effectType: "WhenDigivolving",
              optional: true,
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            },
          ],
        },
      ],
    });
  });
});
