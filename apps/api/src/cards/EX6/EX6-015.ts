import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] You may place up to 3 of your other blue Digimon as this Digimon's bottom digivolution cards.",
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              excludeSelf: true,
              kind: ["Digimon"],
              colors: ["Blue"],
            },
            count: 3,
            upTo: true,
          },
          optional: true,
          trackCount: "xiangpengmonPlacedCount",
          targetIsPermanent: true,
          underFilter: { isSelfRef: true },
          position: "bottom",
          shedOwnCards: true,
        },
        {
          effectTextPart:
            "Then, return all other level 4 or lower Digimon to the hand. For each card placed in this Digimon's digivolution cards, add 1 to the level this effect may return.",
          kind: "Return",
          target: {
            filter: {
              excludeSelf: true,
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
                scaling: {
                  per: 1,
                  unit: "namedCount",
                  countSource: "xiangpengmonPlacedCount",
                },
              },
            },
            count: "all",
          },
          to: "hand",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] You may place up to 3 of your other blue Digimon as this Digimon's bottom digivolution cards.",
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              excludeSelf: true,
              kind: ["Digimon"],
              colors: ["Blue"],
            },
            count: 3,
            upTo: true,
          },
          optional: true,
          trackCount: "xiangpengmonPlacedCount",
          targetIsPermanent: true,
          underFilter: { isSelfRef: true },
          position: "bottom",
          shedOwnCards: true,
        },
        {
          effectTextPart:
            "Then, return all other level 4 or lower Digimon to the hand. For each card placed in this Digimon's digivolution cards, add 1 to the level this effect may return.",
          kind: "Return",
          target: {
            filter: {
              excludeSelf: true,
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
                scaling: {
                  per: 1,
                  unit: "namedCount",
                  countSource: "xiangpengmonPlacedCount",
                },
              },
            },
            count: "all",
          },
          to: "hand",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  levelComparison: {
                    op: "lte",
                    value: 5,
                  },
                  nameOrTrait: [
                    {
                      tokens: ["Aqua", "Sea Animal"],
                      match: "trait",
                    },
                  ],
                },
                count: 1,
              },
              from: ["digivolutionCards"],
              payCost: false,
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          grant: "trait",
          tokens: ["Aquatic"],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX6-015", compiled);
