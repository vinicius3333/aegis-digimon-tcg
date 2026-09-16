import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Armor Purge",
          raw: "＜Armor Purge＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 2,
          fromTop: false,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttacking",
          triggerFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Delete",
              target: {
                sourceRef: "triggerDefender",
                filter: {},
                count: 1,
              },
              condition: {
                kind: "attackTargetMatchesFilter",
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  digivolutionCards: "hasNone",
                },
                raw: "when this Digimon attacks an opponent's Digimon with no digivolution cards",
              },
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Patamon"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT17-064", compiled);
