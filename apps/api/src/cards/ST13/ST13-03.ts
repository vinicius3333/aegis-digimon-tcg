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
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "dp": {
                "op": "lte",
                "value": 5000
              }
            },
            "count": 1
          },
          "cost": {
            "kind": "place",
            "destination": "digivolutionStack",
            "targetIsPermanent": true,
            "host": "target",
            "position": "bottom",
            "target": {
              "filter": {
                "isSelfRef": true
              },
              "count": 1,
              "isSelf": true
            },
            "raw": "By placing this Digimon under 1 of your other Digimon that's black or has [Legend-Arms] in its traits as its bottom digivolution card",
            "underFilter": {
              "or": [
                {
                  "colors": [
                    "Black"
                  ]
                },
                {
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Legend-Arms"
                      ],
                      "match": "trait"
                    }
                  ]
                }
              ],
              "controller": "mine",
              "excludeSelf": true,
              "kind": [
                "Digimon"
              ]
            }
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "dp": {
                "op": "lte",
                "value": 3000
              }
            },
            "count": 1
          },
          "condition": {
            "kind": "youHave",
            "filter": {
              "or": [
                {
                  "colors": [
                    "Black"
                  ]
                },
                {
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Legend-Arms"
                      ],
                      "match": "trait"
                    }
                  ]
                }
              ],
              "zone": "battleArea",
              "controllerDefault": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "raw": "you have a Digimon that's black or has [Legend-Arms] in its traits in play"
          }
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("ST13-03", compiled);
