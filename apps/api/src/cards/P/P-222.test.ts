import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-222.js";

describe("P-222 Rosemon", () => {
  it("reduces play cost by 4 only with a face-up Wind Guardians security card", () => {
    expect(runtimeCompiledCard("P-222")!.effects.find((effect) => effect.trigger === "Static")).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          actions: [
            {
              kind: "Replacement",
              mode: "reduceCost",
              amount: 4,
              condition: {
                kind: "youHave",
                filter: {
                  controllerDefault: "mine",
                  zone: "security",
                  faceUp: true,
                  nameOrTrait: [{ tokens: ["Wind Guardians"], match: "nameExact" }],
                },
              },
            },
          ],
        },
      ],
    });
  });

  it("may suspend any Digimon on play and digivolving", () => {
    const card = runtimeCompiledCard("P-222")!;
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(card.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Suspend",
            optional: true,
            target: { count: 1, filter: { controllerDefault: "any", kind: ["Digimon"] } },
          },
        ],
      });
    }
  });

  it("once per turn may delete an opponent's lowest DP Digimon when any of yours suspends", () => {
    expect(runtimeCompiledCard("P-222")!.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controllerDefault: "mine", kind: ["Digimon"] },
          actions: [
            {
              kind: "Delete",
              optional: true,
              target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestDP" } },
            },
          ],
        },
      ],
    });
  });
});
