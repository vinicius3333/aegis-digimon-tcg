import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[When Digivolving] ＜Digi-Burst 4＞ (Trash 4 of this Digimon's digivolution cards to activate the effect below.)・Suspend all of your opponent's Digimon with 5000 DP or less.",
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 5000,
              },
            },
            count: "all",
          },
          cost: {
            kind: "trash",
            target: {
              filter: {
                isSelfRef: true,
                zone: "digivolutionCards",
              },
              count: 4,
            },
            raw: "＜Digi-Burst 4＞",
          },
        },
        {
          effectTextPart:
            "Then, place all of your opponent's suspended Digimon at the bottom of their owners' decks in any order. Trash all of the digivolution cards of those Digimon.",
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              suspended: true,
              kind: ["Digimon"],
            },
            count: "all",
          },
          to: "deckBottom",
          order: "any",
        },
      ],
      keywords: [
        {
          keyword: "DigiBurst",
          amount: 4,
          raw: "＜Digi-Burst 4＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT4-062", compiled);
