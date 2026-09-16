import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "SecurityAttack",
          amount: 1,
          raw: "＜Security Attack +1＞",
        },
      ],
    },
    {
      trigger: "EndOfAttack",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              kind: ["Digimon"],
              controller: "any",
            },
            count: "all",
          },
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              playCostLte: 3,
              nameOrTrait: [
                {
                  tokens: ["Guilmon", "Growlmon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
          playCostCeiling: {
            base: 3,
            raise: 2,
            per: 10,
            filter: {
              zone: "trash",
              controller: "any",
            },
            unit: "cards",
            raw: "For every 10 total cards in both players' trashes, add 2 to this effect's play cost maximum",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      names: ["Growlmon"],
      cost: 4,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT21-079", compiled);
