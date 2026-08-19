import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-067.js";

describe("BT23-067 LadyDevimon", () => {
  it("reduces its hand play cost by 3 when you have Angewomon or Mirei Mikagura", () => {
    const replacement = (
      compiled.effects.find((entry) => entry.trigger === "Static" && entry.actions.length > 0) as any
    ).actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          mode: "reduceCost",
          amount: 3,
          condition: {
            kind: "youHave",
            filter: { nameOrTrait: [{ tokens: ["Angewomon", "Mirei Mikagura"], match: "name" }] },
          },
        },
      ],
    });
  });

  it("has Blocker and inherited Scapegoat", () => {
    const staticEffects = compiled.effects.filter((entry) => entry.trigger === "Static");
    expect(staticEffects.flatMap((entry) => entry.keywords?.map((keyword) => keyword.keyword) ?? [])).toEqual([
      "Blocker",
      "Scapegoat",
    ]);
    expect(staticEffects.find((entry) => entry.isInherited)?.keywords?.[0]?.keyword).toBe("Scapegoat");
  });

  it("deletes one opposing level 4 or lower Digimon on play and when digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", levelComparison: { op: "lte", value: 4 } }, count: 1 },
      });
    }
  });

  it("requires a level 4 CS Digimon for alternate evolution", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["CS"], cost: 3, isAlternate: true }]);
  });
});
