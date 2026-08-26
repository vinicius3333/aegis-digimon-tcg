// @ts-nocheck
// HAND-FIXED IR for BT10-025 (Cyberdramon) — do not regenerate over this file.
// Printed text: "[Hand][Main] If you have a Digimon with [Blue Flare] in its traits in play,
// by paying 3 memory, place this card under 1 of THOSE Digimon as its bottom digivolution
// card. Then, unsuspend THAT Digimon." A prior IR-reaudit pass (commit 9cdc3ec46) collapsed
// the generated dead-code duplicate ([Hand]+[Main] copies of the same clause) into one Main
// effect (isFromHand:true) — correct — but in doing so also dropped:
//   1. the underFilter's [Blue Flare] trait restriction, letting the PlaceUnder target ANY
//      of the controller's Digimon rather than only a Blue-Flare one;
//   2. the Unsuspend action's link back to the specific Digimon just placed under, leaving it
//      free to unsuspend an unrelated Digimon of the controller's.
// Restored (1) directly on underFilter, and re-expressed (2) via the supported bindHostAs/
// boundRef mechanism (EX6-007 precedent) instead of the unsupported `hasDigivolutionCard:
// {filter}` shape effects.json still carried (permanentMatchesFilter never reads that field).
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          position: "bottom",
          underFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Blue Flare"],
                match: "trait",
              },
            ],
          },
          condition: {
            kind: "youHave",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Blue Flare"],
                  match: "trait",
                },
              ],
            },
            raw: "you have a Digimon with [Blue Flare] in its traits in play",
          },
          cost: {
            kind: "payMemory",
            memory: 3,
            raw: "by paying 3 memory",
          },
          abortOnDecline: true,
          bindHostAs: "bt10025PlaceHost",
        },
        {
          kind: "Unsuspend",
          target: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              boundRef: "bt10025PlaceHost",
            },
            count: 1,
          },
        },
      ],
      isFromHand: true,
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "modifyDP",
            amount: 1000,
          },
          while: {
            kind: "opponentHas",
            filter: {
              zone: "battleArea",
              controllerDefault: "opponent",
              kind: ["Digimon"],
            },
            count: 2,
            raw: "your opponent has 2 or more Digimon in play",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT10-025", compiled);
