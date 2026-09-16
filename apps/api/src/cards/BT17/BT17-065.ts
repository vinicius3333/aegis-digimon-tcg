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
          sourceFilter: { zone: "trash", controller: "mine" },
          target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Dorugamon"], match: "name" }] }, count: 1 },
          leaveCause: "any",
          digivolveFromTrash: true,
          optional: true,
          abortOnDecline: true,
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
          effectTextPart:
            "Then, ＜Draw 1＞. If [Dorugamon] is in this Digimon's digivolution cards or this digivolved from the trash, delete 1 of your opponent's Digimon with a play cost of 4 or less instead.",
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
          effectTextPart:
            "Then, ＜Draw 1＞. If [Dorugamon] is in this Digimon's digivolution cards or this digivolved from the trash, delete 1 of your opponent's Digimon with a play cost of 4 or less instead.",
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
      actions: [],
      isInherited: true,
      keywords: [{ keyword: "Reboot", raw: "＜Reboot＞" }],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Dorugamon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

export default compiled;

registerIrCard("BT17-065", compiled);
