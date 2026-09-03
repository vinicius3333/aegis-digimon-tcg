import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          cost: {
            kind: "place",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Seasarmon"],
                    match: "name",
                  },
                ],
                orFilters: [
                  {
                    zone: "hand",
                    controller: "mine",
                    kind: ["Digimon"],
                    colors: ["Blue"],
                    levels: [3],
                  },
                ],
              },
              count: 1,
              from: ["hand"],
            },
            raw: "By placing 1 [Seasarmon] or 1 level 3 blue Digimon card from your hand as this Digimon's bottom digivolution card",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "selfHasKeyword",
            keyword: "Jamming",
            raw: "this Digimon has ＜Jamming＞",
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT17-021", compiled);
export { compiled };
