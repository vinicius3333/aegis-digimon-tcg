// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
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
          }
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
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
          }
        }
      ]
    },
    {
      "trigger": "EndOfYourTurn",
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
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Jesmon"
                ],
                "match": "name"
              }
            ]
          },
          "payCost": false,
          "from": [
            "hand"
          ],
          "optional": true,
          "cost": {
            "kind": "suspend",
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
            "raw": "By suspending 1 of your other Digimon"
          },
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
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
            "keyword": "Alliance",
            "raw": "＜Alliance＞"
          },
          "duration": "permanent",
          "condition": {
            "kind": "selfHasTrait",
            "filter": {
              "nameOrTrait": [
                {
                  "tokens": [
                    "Royal Knight"
                  ],
                  "match": "trait"
                }
              ]
            }
          }
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT20-014", compiled);
