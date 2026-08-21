// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// ST17-06 Rapidmon.
// <Blocker> <Armor Purge>
// [All Turns][Once Per Turn] When this Digimon becomes suspended:
//   1 of your opponent's Digimon AND all of their Security Digimon get -4000 DP
//   until the end of their turn.
// [Inherited][All Turns] While this Digimon is suspended, it gets +1000 DP.
// Digivolve: from Lv3 w/[Terriermon] in name for 3 (alternate)
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Blocker",
          "raw": "＜Blocker＞"
        },
        {
          "keyword": "Armor Purge",
          "raw": "＜Armor Purge＞"
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenSuspended",
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [
            {
              "kind": "ModifyDP",
              "target": {
                "filter": {
                  "controller": "opponent",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1
              },
              "amount": -4000,
              "duration": "untilOpponentTurnEnd"
            },
            {
              "kind": "ModifySecurityDP",
              "controller": "opponent",
              "amount": -4000,
              "duration": "untilOpponentTurnEnd"
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "Aura",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "effect": {
            "kind": "modifyDP",
            "amount": 1000
          },
          "while": {
            "kind": "selfIsSuspended",
            "raw": "this Digimon is suspended"
          }
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 3,
      "names": [
        "Terriermon"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("ST17-06", compiled);
