import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-036.js";

describe("BT23-036 BanchoLeomon", () => {
  it("reduces its play cost when the opponent has a 10000+ DP Digimon", () => {
    const replacement = (compiled.effects.find((entry) => entry.trigger === "Static") as any).actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "Replacement",
          mode: "reduceCost",
          amount: 5,
          condition: {
            kind: "opponentHas",
            filter: { controllerDefault: "opponent", kind: ["Digimon"], dp: { op: "gte", value: 10000 } },
          },
        },
      ],
    });
  });

  it("lets one other Digimon digivolve into a level 6-or-lower Leomon/CS Digimon from hand", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "Digivolve",
        target: { filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] }, count: 1 },
        into: {
          controllerDefault: "mine",
          kind: ["Digimon"],
          levelComparison: { op: "lte", value: 6 },
          nameOrTrait: [
            { tokens: ["Leomon"], match: "name" },
            { tokens: ["CS"], match: "trait" },
          ],
        },
        from: ["hand"],
        payCost: false,
        optional: true,
      });
    }
  });

  it("grants Raid and attacks the same Digimon at end of turn", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn") as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Raid" },
      target: { count: 1 },
    });
    expect(effect.actions[1]).toMatchObject({ kind: "Attack", target: { count: 1, sameTarget: true }, optional: true });
  });
});
