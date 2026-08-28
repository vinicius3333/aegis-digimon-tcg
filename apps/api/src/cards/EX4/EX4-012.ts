// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for EX4-012 (VictoryGreymon).
// runtime-effect fixes:
// - [When Digivolving] Delete: raiseCeiling scaling is now a property on the Delete action itself
//   (dpCeiling + dpCeilingScaling) rather than a separate CostModifier action.
//   Base ceiling is 6000 DP; each opponent Digimon in play (battleArea) adds 2000.
// - dpCeilingScaling filter zone: "battleArea" added to restrict to Digimon in play.
// - [All Turns] SubTrigger: "you have a Tamer in play" is a precondition on the SubTrigger itself
//   (condition on the outer SubTrigger), not on the inner Delete action.
// - Tamer condition filter: zone "battleArea" added.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 6000,
              },
            },
            count: 1,
          },
          dpCeiling: 6000,
          dpCeilingScaling: {
            per: 1,
            amount: 2000,
            filter: {
              zone: "battleArea",
              controller: "opponent",
              kind: ["Digimon"],
            },
            unit: "cards",
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
          sourceFilter: {
            controller: "opponent",
            kind: ["Digimon"],
          },
          condition: {
            kind: "youHave",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              kind: ["Tamer"],
            },
            raw: "you have a Tamer in play",
          },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  superlative: "highestDP",
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

registerIrCard("EX4-012", compiled);
