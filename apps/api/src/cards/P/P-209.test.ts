import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-209.js";

describe("P-209 Titamon", () => {
  it("has the alternate Demon or TS digivolution requirement and Alliance", () => {
    const card = runtimeCompiledCard("P-209")!;
    expect(card.digivolutionRequirement).toEqual([{ level: 5, traits: ["Demon", "TS"], cost: 3, isAlternate: true }]);
    expect(card.effects.find((effect) => effect.trigger === "Static")).toMatchObject({
      keywords: [{ keyword: "Alliance", raw: "＜Alliance＞" }],
    });
  });

  it("gates both on-play effects behind trashing a card, then suspends and restricts an opponent's Digimon or Tamer", () => {
    const card = runtimeCompiledCard("P-209")!;
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(card.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Trash",
            optional: true,
            abortOnDecline: true,
            target: { count: 1, filter: { controller: "mine", zone: "hand" } },
          },
          { kind: "Suspend", target: { count: 1, filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } } },
          {
            kind: "Restrict",
            restriction: "unsuspend",
            duration: "untilOpponentTurnEnd",
            target: { count: 1, filter: { controllerDefault: "opponent", kind: ["Digimon", "Tamer"] } },
          },
        ],
      });
    }
  });

  it("once per turn may play a level 4 or lower Demon from trash when your hand is trashed", () => {
    expect(runtimeCompiledCard("P-209")!.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenHandTrashed",
          sourceFilter: { controller: "mine" },
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["trash"],
              payCost: false,
              optional: true,
              target: {
                count: 1,
                filter: {
                  controller: "mine",
                  levelComparison: { op: "lte", value: 4 },
                  nameOrTrait: [{ tokens: ["Demon"], match: "trait" }],
                },
              },
            },
          ],
        },
      ],
    });
  });
});
