// @ts-nocheck
// Hand-authored override for BT17-065 (DexDorugamon).
// runtime-effect fix: [Trash] replacement digivolves the would-be-deleted Dorugamon
// into this card from trash before preventing deletion. [When Digivolving] keeps
// the mandatory hand trash, then branches Draw vs delete-4-or-less according to
// the structured Dorugamon-in-stack / digivolved-from-trash condition (KB Q2820).
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
          mode: "prevent",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Dorugamon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: {},
                count: 1,
                sourceRef: "triggerSubject",
              },
              into: {
                controller: "mine",
                zone: "trash",
                isSelfRef: true,
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["DexDorugamon"],
                    match: "name",
                  },
                ],
              },
              from: ["trash"],
              payCost: false,
              bindResultAs: "digivolvedToPreventDeletion",
            },
            {
              kind: "Prevent",
              condition: {
                kind: "bindingExists",
                ref: "digivolvedToPreventDeletion",
                raw: "digivolved that Dorugamon into this DexDorugamon",
              },
            },
          ],
          optional: true,
          raw: "When one of your [Dorugamon] would be deleted, by digivolving it into this card without paying the cost, prevent that deletion.",
        },
      ],
      isFromTrash: true,
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Trash",
          target: {
            filter: {
              controller: "mine",
              zone: "hand",
            },
            count: 1,
          },
        },
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: {
            kind: "not",
            condition: {
              kind: "anyOf",
              conditions: [
                {
                  kind: "selfHasInDigivolutionCards",
                  nameOrTrait: [
                    {
                      tokens: ["Dorugamon"],
                      match: "name",
                    },
                  ],
                  raw: "[Dorugamon] is in this Digimon's digivolution cards",
                },
                {
                  kind: "digivolvedFromZone",
                  zone: "trash",
                  raw: "this digivolved from the trash",
                },
              ],
            },
            raw: "draw unless [Dorugamon] is in this Digimon's digivolution cards or this digivolved from the trash",
          },
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              playCostLte: 4,
            },
            count: 1,
          },
          condition: {
            kind: "anyOf",
            conditions: [
              {
                kind: "selfHasInDigivolutionCards",
                nameOrTrait: [
                  {
                    tokens: ["Dorugamon"],
                    match: "name",
                  },
                ],
                raw: "[Dorugamon] is in this Digimon's digivolution cards",
              },
              {
                kind: "digivolvedFromZone",
                zone: "trash",
                raw: "this digivolved from the trash",
              },
            ],
          },
        },
      ],
    },
    {
      trigger: "Static",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Reboot",
          },
          duration: "permanent",
        },
      ],
      isInherited: true,
      keywords: [],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Dorugamon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

export default compiled;

registerIrCard("BT17-065", compiled);
