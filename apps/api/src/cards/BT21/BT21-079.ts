import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for BT21-079 (Megidramon).
// Fixes:
// 1. EndOfAttack Delete: text says "Delete all Digimon" — both players' Digimon.
//    Removed controllerDefault:"opponent" → no controller filter (affects all).
// 2. OnDeletion CostModifier scaling: text says "both players' trashes" so the scaling
//    filter must count cards from both players' trashes (no controller restriction).
// 3. CostModifier is integrated into PlayWithoutCost as a dynamic ceiling, not a sibling
//    action. Using inline playCostCeiling with scaling per 10 cards in both trashes.
//    The base ceiling is 3 (playCostLte:3) + 2 per 10 total cards in both trashes.
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
