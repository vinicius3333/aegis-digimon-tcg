import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Fortitude",
          raw: "＜Fortitude＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[When Digivolving] [On Deletion] ＜De-Digivolve  1＞ on 1 of your opponent's Digimon (Trash up to 1 card from the top of one of your opponent's Digimon. If it has no digivolution cards, or becomes a level 3 Digimon, you can't trash any more cards).",
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 1,
        },
        {
          effectTextPart: "Then, return 1 of their 6000 DP or lower Digimon to the bottom of the deck.",
          kind: "Return",
          target: {
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 6000,
              },
            },
            count: 1,
          },
          to: "deckBottom",
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          effectTextPart:
            "[When Digivolving] [On Deletion] ＜De-Digivolve  1＞ on 1 of your opponent's Digimon (Trash up to 1 card from the top of one of your opponent's Digimon. If it has no digivolution cards, or becomes a level 3 Digimon, you can't trash any more cards).",
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 1,
        },
        {
          effectTextPart: "Then, return 1 of their 6000 DP or lower Digimon to the bottom of the deck.",
          kind: "Return",
          target: {
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 6000,
              },
            },
            count: 1,
          },
          to: "deckBottom",
        },
      ],
    },
    {
      trigger: "EndOfAttack",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 4000,
              },
            },
            count: 1,
          },
          to: "deckBottom",
          bindResultAs: "endOfAttackReturned",
        },
        {
          kind: "Unsuspend",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          condition: {
            kind: "bindingEmpty",
            ref: "endOfAttackReturned",
            raw: "If you didn't",
          },
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      names: ["Leomon"],
      cost: 4,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX5-055", compiled);
