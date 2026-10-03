import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "SecurityAttack",
          amount: 2,
          raw: "＜Security Attack +2＞",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "opponent",
            kind: ["Digimon", "Tamer"],
            byEffect: true,
          },
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Leviamon"],
                      match: "nameExact",
                    },
                  ],
                },
                count: 1,
                orFilters: [
                  {
                    controller: "mine",
                    kind: ["Digimon"],
                    digivolutionStackNameOrTrait: [
                      {
                        tokens: ["X Antibody"],
                        match: "nameExact",
                      },
                    ],
                  },
                ],
              },
              into: {
                isSelfRef: true,
              },
              payCost: false,
              optional: true,
            },
          ],
        },
      ],
      isFromTrash: true,
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[When Digivolving] If your opponent has as many or more total Digimon and Tamers as you, delete 1 of their Tamers.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Tamer"],
            },
            count: 1,
          },
          condition: {
            kind: "boardCountCompare",
            left: "opponent",
            op: "gte",
            right: "mine",
            filter: {
              kind: ["Digimon", "Tamer"],
            },
            raw: "your opponent has as many or more total Digimon and Tamers as you",
          },
        },
        {
          effectTextPart:
            "Then, delete 1 of your opponent's level 3, 1 of their level 5 and 1 of their level 7 Digimon.",
          kind: "Delete",
          target: {
            count: 1,
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levels: [3],
            },
          },
        },
        {
          effectTextPart:
            "Then, delete 1 of your opponent's level 3, 1 of their level 5 and 1 of their level 7 Digimon.",
          kind: "Delete",
          target: {
            count: 1,
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levels: [5],
            },
          },
        },
        {
          effectTextPart:
            "Then, delete 1 of your opponent's level 3, 1 of their level 5 and 1 of their level 7 Digimon.",
          kind: "Delete",
          target: {
            count: 1,
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levels: [7],
            },
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT15-081", compiled);
export { compiled };
