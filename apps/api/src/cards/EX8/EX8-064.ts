import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  dnaDigivolveRequirement: [
    {
      cost: 0,
      materials: [
        {
          color: "Purple",
          level: 6,
        },
        {
          color: "Yellow",
          level: 6,
        },
      ],
    },
    {
      cost: 0,
      materials: [
        {
          color: "Purple",
          level: 6,
        },
        {
          color: "Green",
          level: 6,
        },
      ],
    },
    {
      cost: 0,
      materials: [
        {
          color: "Black",
          level: 6,
        },
        {
          color: "Yellow",
          level: 6,
        },
      ],
    },
    {
      cost: 0,
      materials: [
        {
          color: "Black",
          level: 6,
        },
        {
          color: "Green",
          level: 6,
        },
      ],
    },
    {
      cost: 0,
      materials: [
        {
          namesExact: ["Piedmon"],
        },
        {
          namesExact: ["Myotismon"],
        },
      ],
    },
  ],
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[When Digivolving] ＜De-Digivolve3＞ 1 of your opponent's Digimonand, for the turn, all of their Digimon get -6000 DP.",
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 3,
        },
        {
          effectTextPart:
            "[When Digivolving] ＜De-Digivolve3＞ 1 of your opponent's Digimonand, for the turn, all of their Digimon get -6000 DP.",
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          amount: -6000,
          duration: "forTheTurn",
        },
        {
          effectTextPart:
            "Then, if DNA digivolving, you may play up to 10 play cost's total worth of [NSo] trait Digimon cards from your trash without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["NSo"],
                  match: "trait",
                },
              ],
            },
            count: "all",
            upTo: true,
            totalPlayCostBudget: 10,
          },
          from: ["trash"],
          payCost: false,
          condition: {
            kind: "isDnaDigivolving",
            raw: "DNA digivolving",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: {
            controllerDefault: "any",
            excludeSelf: true,
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "Trash",
              target: {
                filter: {
                  zone: "security",
                  controller: "opponent",
                  position: "top",
                },
                count: 1,
              },
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX8-064", compiled);
