// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for BT23-091 (Wolkenapalm, Red/CS Option).
// Text:
//   While you have a Digimon or Tamer with the [CS] trait on the field, you can ignore
//   this card's color requirements.
//   [Main] Delete 1 of your opponent's Digimon with the lowest DP. Then, place this
//   card in the battle area.
//   [Your Turn] When one of your [CS] trait Digimon attacks, ＜Delay＞
//   ・Delete 1 of your opponent's Digimon with the lowest DP.
//   [Security] Delete 1 of your opponent's Digimon with the lowest DP. Then, place this
//   card in the battle area.
// The attack-triggered ＜Delay＞ is intrinsic to that timing window: accepting it trashes
// this option and immediately resolves the lowest-DP deletion.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          condition: {
            kind: "youHave",
            filter: {
              zone: "field",
              controllerDefault: "mine",
              kind: ["Digimon", "Tamer"],
              nameOrTrait: [
                {
                  tokens: ["CS"],
                  match: "trait",
                },
              ],
            },
            raw: "you have a Digimon or Tamer with the [CS] trait on the field (battle area or breeding area, per KB Q5364)",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "lowestDP",
            },
            count: 1,
          },
        },
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttacking",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["CS"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestDP" },
                count: 1,
              },
            },
          ],
          raw: "When one of your [CS] trait Digimon attacks, ＜Delay＞",
        },
      ],
      keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "lowestDP",
            },
            count: 1,
          },
        },
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT23-091", compiled);
