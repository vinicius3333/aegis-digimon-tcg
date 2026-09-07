import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT21-016 Shoutmon (King Version):
// [Digivolve] Lv.3 w/[Xros Heart]/[Hero] trait: Cost 2
// <Raid> <Piercing>
// [On Deletion] You may place 1 Digimon card with [Xros Heart]/[Blue Flare]/[Hero]
//   trait from your hand or trash under any of your Tamers. Then, <Save>.
// [DigiXros -1] 1 Digimon card w/[Xros Heart] trait
// [Inherited][Your Turn] This Digimon gets +2000 DP.
//
// Notes:
// - Digivolution traits list is OR-match (standard Digimon TCG / notation).
// - <Save> after "Then," remains an independent optional process (CR 16-20-3).
// - DigiXros count:1 = reduce cost by 1 per placed material (ir.ts DigiXrosRequirement.count).

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Raid",
          raw: "＜Raid＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Piercing",
          raw: "＜Piercing＞",
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Xros Heart", "Blue Flare", "Hero"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            from: ["hand", "trash"],
          },
          underFilter: {
            controller: "mine",
            kind: ["Tamer"],
            excludeToken: true,
          },
          optional: true,
        },
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          underFilter: {
            controller: "mine",
            kind: ["Tamer"],
            excludeToken: true,
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 2000,
          duration: "permanent",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 3,
      traits: ["Xros Heart", "Hero"],
      cost: 2,
      isAlternate: true,
    },
  ],
  digiXrosRequirement: [
    {
      materials: [
        {
          traits: ["Xros Heart"],
        },
      ],
      count: 1,
      maxMaterials: 1,
    },
  ],
};

registerIrCard("BT21-016", compiled);
