import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnDeletion",
      actions: [
        {
          effectTextPart: "[On Deletion] Return all Tamers to their owners' hands.",
          kind: "Return",
          target: {
            filter: {
              controller: "any",
              kind: ["Tamer"],
            },
            count: "all",
          },
          to: "hand",
        },
        {
          effectTextPart:
            "Then, you may play 1 Tamer card from your hand and 1 [Ukkomon] from your trash without paying the costs.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              kind: ["Tamer"],
            },
            count: 1,
            controller: "mine",
            location: "hand",
          },
          payCost: false,
          optional: true,
          abortOnDecline: true,
        },
        {
          effectTextPart:
            "Then, you may play 1 Tamer card from your hand and 1 [Ukkomon] from your trash without paying the costs.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              nameOrTrait: [
                {
                  tokens: ["Ukkomon"],
                  match: "nameExact",
                },
              ],
              kind: ["Digimon"],
              controller: "mine",
            },
            count: 1,
            controller: "mine",
            location: "trash",
          },
          from: ["trash"],
          payCost: false,
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          effectTextPart:
            "[End of Your Turn] [Once Per Turn] By returning 1 Digi-Egg card from your trash to the bottom of the Digi-Egg deck, delete 1 of your opponent's Digimon with the lowest level.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "lowestLevel",
            },
            count: 1,
          },
          cost: {
            kind: "return",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                kind: ["DigiEgg"],
              },
              count: 1,
            },
            raw: "By returning 1 Digi-Egg card from your trash to the bottom of the Digi-Egg deck",
          },
          abortOnDecline: true,
        },
        {
          effectTextPart:
            "Then, you may play 1 level 4 or lower Digimon card from your hand to an empty space in your breeding area without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          breeding: true,
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT16-083", compiled);
export { compiled };
