import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          sourceFilter: {
            zone: "trash",
            controller: "mine",
          },
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Dorugoramon"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          mode: "prevent",
          leaveCause: "any",
          digivolveFromTrash: true,
          optional: true,
          abortOnDecline: true,
          raw: "By digivolving it into this card without paying the cost",
        },
      ],
      isFromTrash: true,
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[When Digivolving] ＜De-Digivolve3＞ 1 of your opponent's Digimon (Trash up to 3 cards from the top. You can't trash past level 3 cards).",
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 3,
          stopAtLevel: 3,
        },
        {
          effectTextPart:
            "Then, if [Dorugoramon] is in this Digimon's digivolution cards or this card is digivolving from the trash, delete all of your opponent's Digimon with the lowest level.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "lowestLevel",
            },
            count: "all",
          },
          condition: {
            kind: "anyOf",
            conditions: [
              { kind: "selfHasInDigivolutionCards", nameOrTrait: [{ tokens: ["Dorugoramon"], match: "nameExact" }] },
              { kind: "digivolvedFromZone", zone: "trash" },
            ],
            raw: "[Dorugoramon] is in this Digimon's digivolution cards or this card is digivolving from the trash",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          raw: "[All Turns] [Once Per Turn] When another Digimon is deleted, you may unsuspend this Digimon.",
          effectTextPart:
            "[All Turns] [Once Per Turn] When another Digimon is deleted, you may unsuspend this Digimon.",
          sourceFilter: {
            excludeSelf: true,
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "Unsuspend",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Dorugoramon"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT17-073", compiled);
