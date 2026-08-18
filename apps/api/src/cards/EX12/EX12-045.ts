// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "toHand",
          "controller": "mine",
          "amount": 1,
          "toTop": true,
          "optional": true
        },
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "keyword": {
            "keyword": "Recovery",
            "amount": 1,
            "raw": "＜Recovery +1＞"
          },
          "duration": "permanent",
          "condition": {
            "kind": "zoneCount",
            "seat": "mine",
            "zone": "security",
            "op": "lte",
            "value": 2,
            "raw": "you have 2 or fewer security cards"
          }
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "toHand",
          "controller": "mine",
          "amount": 1,
          "toTop": true,
          "optional": true
        },
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "keyword": {
            "keyword": "Recovery",
            "amount": 1,
            "raw": "＜Recovery +1＞"
          },
          "duration": "permanent",
          "condition": {
            "kind": "zoneCount",
            "seat": "mine",
            "zone": "security",
            "op": "lte",
            "value": 2,
            "raw": "you have 2 or fewer security cards"
          }
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenSecurityRemoved",
          "actions": [
            {
              "kind": "PlayWithoutCost",
              "target": {
                "filter": {
                  "controller": "mine",
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Gokuumon"
                      ],
                      "match": "text"
                    },
                    {
                      "tokens": [
                        "SW"
                      ],
                      "match": "trait"
                    }
                  ]
                },
                "count": 1
              },
              "from": [
                "hand"
              ],
              "payCost": true,
              "reduceCostBy": 2,
              "optional": true
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "WhenAttacking",
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
          "duration": "forTheTurn"
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
      "level": 4,
      "traits": [
        "Shambala"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("EX12-045", compiled);
