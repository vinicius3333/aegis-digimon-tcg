// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// P-030 Lobomon — hand-corrected IR.
// [When Digivolving] Digivolve into AncientGarurumon (cost 1, ignore requirements);
//   if it does, delete this Digimon at end of turn.
// [Your Turn] (inherited) When digivolving into AncientGarurumon, reduce cost by 2.
// KB Q4141: must delete even if further digivolutions occur before end of turn.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Digivolve",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "into": {
            "controllerDefault": "mine",
            "nameOrTrait": [
              {
                "tokens": [
                  "AncientGarurumon"
                ],
                "match": "nameExact"
              }
            ]
          },
          "payCost": true,
          "from": [
            "hand"
          ],
          "costOverride": 1,
          "ignoreRequirements": true,
          "optional": true
        },
        {
          "kind": "SubTrigger",
          "event": "endOfTurn",
          "once": true,
          "condition": {
            "kind": "ifThisEffectDigivolved",
            "raw": "if it digivolved"
          },
          "actions": [
            {
              "kind": "Delete",
              "target": {
                "filter": {
                  "isSelfRef": true
                },
                "count": 1,
                "isSelf": true
              }
            }
          ]
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "CostModifier",
          "mode": "reduce",
          "costType": "digivolve",
          "amount": 2,
          "sourceFilter": {
            "isSelfRef": true
          },
          "duration": "forTheTurn",
          "into": {
            "controllerDefault": "mine",
            "nameOrTrait": [
              {
                "tokens": ["AncientGarurumon"],
                "match": "nameExact"
              }
            ]
          },
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          }
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("P-030", compiled);
