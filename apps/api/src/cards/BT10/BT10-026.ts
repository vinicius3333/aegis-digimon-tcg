// @ts-nocheck
// HAND-FIXED IR for BT10-026 — do not regenerate.
// Restores Armor Purge and the printed DigiXros recipe. PlaceUnder accepts only hand or
// under-Tamer Blue Flare cards and inserts them at the bottom. The attack/block clause is one
// target selection, not two independent restrictions that could affect different Digimon.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Armor Purge",
          raw: "＜Armor Purge＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Blue Flare"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["hand", "underTamer"],
          position: "bottom",
          optional: true,
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          restriction: "attackOrBlock",
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "selfHasInDigivolutionCards",
            nameOrTrait: [{ tokens: ["Deckerdramon"], match: "nameExact" }],
            raw: "[Deckerdramon] is in this Digimon's digivolution cards",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Blue Flare"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["hand", "underTamer"],
          position: "bottom",
          optional: true,
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          restriction: "attackOrBlock",
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "selfHasInDigivolutionCards",
            nameOrTrait: [{ tokens: ["Deckerdramon"], match: "nameExact" }],
            raw: "[Deckerdramon] is in this Digimon's digivolution cards",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digiXrosRequirement: [
    {
      materials: [{ names: ["MetalGreymon"] }, { names: ["Deckerdramon"] }],
      count: 2,
    },
  ],
};

registerIrCard("BT10-026", compiled);
