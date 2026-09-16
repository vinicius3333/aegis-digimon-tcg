import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [],
          rest: "deckTopOrBottom",
        },
        {
          kind: "CostModifier",
          mode: "reduce",
          costType: "play",
          amount: 1,
          existingPermanent: true,
          scaling: {
            per: 1,
            filter: {
              zone: "revealed",
              controllerDefault: "mine",
              nameOrTrait: [
                {
                  tokens: ["D-Brigade", "DigiPolice"],
                  match: "trait",
                },
              ],
            },
            unit: "cards",
          },
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              zone: "battleArea",
            },
            count: "all",
          },
          duration: "forTheTurn",
        },
        {
          effectTextPart: "Then, delete 1 of your opponent's Digimon with a play cost of 4 or less.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              playCostLte: 4,
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [],
          rest: "deckTopOrBottom",
        },
        {
          kind: "CostModifier",
          mode: "reduce",
          costType: "play",
          amount: 1,
          existingPermanent: true,
          scaling: {
            per: 1,
            filter: {
              zone: "revealed",
              controllerDefault: "mine",
              nameOrTrait: [
                {
                  tokens: ["D-Brigade", "DigiPolice"],
                  match: "trait",
                },
              ],
            },
            unit: "cards",
          },
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              zone: "battleArea",
            },
            count: "all",
          },
          duration: "forTheTurn",
        },
        {
          effectTextPart: "Then, delete 1 of your opponent's Digimon with a play cost of 4 or less.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              playCostLte: 4,
            },
            count: 1,
          },
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
            controller: "mine",
            excludeSelf: true,
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["D-Brigade", "DigiPolice"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
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
          ],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT16-060", compiled);
export { compiled };
