// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q5806-Q5808 (binding):
//   - If deletion of own Digimon fails (blocked by another effect), the attack cannot be ended.
//   - "End the attack" transitions to end-of-attack timing, bypassing counter/block timing.
//   - EndAttack works even against Digimon unaffected by effects.
// Inherited effect: cost = deleteOwn, action = EndAttack (not Prevent, not empty).
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Mirai Kinosaki"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "hand"
          ],
          "payCost": false,
          "condition": {
            "kind": "youHaveFewOrEqual",
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Tamer"
              ]
            },
            "count": 1,
            "raw": "you have 1 or fewer Tamers"
          },
          "optional": true
        }
      ]
    },
    {
      "trigger": "OpponentsTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenOpponentAttacks",
          "actions": [
            {
              "kind": "Delete",
              "target": {
                "filter": {
                  "controller": "mine",
                  "excludeSelf": true,
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1
              },
              "cost": true,
              "raw": "by deleting 1 of your other Digimon"
            },
            {
              "kind": "EndAttack"
            }
          ],
          "optional": true,
          "abortOnDecline": true
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 3,
      "traits": [
        "Puppet"
      ],
      "cost": 2,
      "isAlternate": true
    }
  ]
};

registerIrCard("EX11-021", compiled);
