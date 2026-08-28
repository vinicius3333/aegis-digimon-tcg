// @ts-nocheck
// Hand-authored override for BT5-092 (Nokia Shiramine).
// runtime-effect fix: second effect is a Main-activated cost reduction for digivolving into
// named cards (Garurumon/Omnimon/Greymon family, excluding DoruGreymon/BurningGreymon/
// DexDoruGreymon). The CostModifier is consumed at the live digivolution-cost check, including
// digivolution performed by an effect.
// Encoded as CostModifier with restriction:suspendThisTamer, optional:true, with
// an into filter restricting the digivolve target to the named cards.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Agumon", "Gabumon"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "CostModifier",
          mode: "reduce",
          costType: "digivolve",
          amount: 1,
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              zone: "battleArea",
            },
          },
          into: {
            zone: "hand",
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Garurumon", "Omnimon", "Greymon"],
                match: "name",
              },
            ],
            excludeNameOrTrait: [
              { tokens: ["DoruGreymon"], match: "nameExact" },
              { tokens: ["BurningGreymon"], match: "nameExact" },
              { tokens: ["DexDoruGreymon"], match: "nameExact" },
            ],
          },
          restriction: "suspendThisTamer",
          optional: true,
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT5-092", compiled);
