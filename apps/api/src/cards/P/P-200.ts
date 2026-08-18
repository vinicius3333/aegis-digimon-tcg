// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// P-200 Kanan Yuki — hand-fixed IR.
// [Start of Your Main Phase] If you have 4 or less memory, suspend 1 of your opponent's Digimon.
// [Your Turn] When any of your Digimon would digivolve into a Digimon card with the [TS] trait,
//   by suspending this Tamer, reduce the digivolution cost by 1.
// [Security] Place this card in the battle area.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "StartOfYourMainPhase",
      "actions": [
        {
          "kind": "Suspend",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"]
            },
            "count": 1
          },
          "condition": {
            "kind": "memoryAtMost",
            "value": 4
          }
        }
      ]
    },
    {
      // [Your Turn] When any of your Digimon would digivolve into a Digimon card
      // with the [TS] trait, by suspending this Tamer, reduce the digivolution cost by 1.
      // The outer Replacement intercepts the would-digivolve event, filtered by source
      // (my Digimon) and target card (must have [TS] trait). The cost is suspending this
      // Tamer; the effect is a nested reduceCost replacement.
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldDigivolve",
          "sourceFilter": {
            "controller": "mine",
            "kind": ["Digimon"]
          },
          "into": {
            "controllerDefault": "mine",
            "kind": ["Digimon"],
            "nameOrTrait": [
              {
                "tokens": ["TS"],
                "match": "trait"
              }
            ]
          },
          "actions": [
            {
              "kind": "Replacement",
              "event": "wouldDigivolve",
              "mode": "reduceCost",
              "amount": 1,
              "raw": "reduce the digivolution cost by 1"
            }
          ],
          "cost": {
            "kind": "suspend",
            "target": {
              "filter": { "isSelfRef": true },
              "count": 1,
              "isSelf": true
            },
            "raw": "by suspending this Tamer, reduce the digivolution cost by 1"
          }
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": { "isSelfRef": true },
            "count": 1,
            "isSelf": true
          },
          "payCost": false
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("P-200", compiled);
