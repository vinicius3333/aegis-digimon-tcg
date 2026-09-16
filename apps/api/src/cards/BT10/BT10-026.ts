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
          effectTextPart:
            "[On Play][When Digivolving] You may place 1 Digimon card with [Blue Flare] in its traits from your hand or from under one of your Tamers under this Digimon as its bottom digivolution card.",
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
          effectTextPart:
            "[On Play][When Digivolving] You may place 1 Digimon card with [Blue Flare] in its traits from your hand or from under one of your Tamers under this Digimon as its bottom digivolution card.",
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
