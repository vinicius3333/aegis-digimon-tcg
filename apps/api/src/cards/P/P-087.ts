// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// P-087 Ritsu Kodo — hand-corrected IR.
// [Your Turn] When you would play a Pulsemon, by suspending this tamer:
//   if security >= 3, Draw 1; if security <= 3, gain 1 memory.
// KB Q4179: both effects activate when security == exactly 3.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenPlayed",
          "sourceFilter": {
            "controller": "mine",
            "nameOrTrait": [
              {
                "tokens": [
                  "Pulsemon"
                ],
                "match": "name"
              }
            ]
          },
          "cost": {
            "kind": "suspend",
            "target": {
              "filter": {
                "isSelfRef": true
              },
              "count": 1,
              "isSelf": true
            },
            "raw": "by suspending this tamer"
          },
          "actions": [
            {
              "kind": "Draw",
              "controller": "mine",
              "amount": 1,
              "condition": {
                "kind": "zoneCount",
                "seat": "mine",
                "zone": "security",
                "op": "gte",
                "value": 3,
                "raw": "you have 3 or more security cards"
              }
            },
            {
              "kind": "GainMemory",
              "amount": 1,
              "condition": {
                "kind": "zoneCount",
                "seat": "mine",
                "zone": "security",
                "op": "lte",
                "value": 3,
                "raw": "you have 3 or fewer security cards"
              }
            }
          ]
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "isSelfRef": true
            },
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

registerIrCard("P-087", compiled);
