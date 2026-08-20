// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
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
            "filter": {
              "isSelfRef": true
            }
          },
          "payCost": true,
          "reduceCost": 0,
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "zone": "trash",
                "controller": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Lobomon"
                    ],
                    "match": "name"
                  }
                ]
              },
              "count": 1,
              "from": [
                "trash"
              ]
            },
            "raw": "By placing 1 [Lobomon] and 1 [KendoGarurumon] from your trash under 1 of your [Koji Minamoto]s",
            "underFilter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Koji Minamoto"
                  ],
                  "match": "name"
                }
              ]
            }
          },
          "additionalCosts": [
            {
              "kind": "place",
              "target": {
                "filter": {
                  "zone": "trash",
                  "controller": "mine",
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "KendoGarurumon"
                      ],
                      "match": "name"
                    }
                  ]
                },
                "count": 1,
                "from": [
                  "trash"
                ]
              },
              "raw": "By placing 1 [Lobomon] and 1 [KendoGarurumon] from your trash under 1 of your [Koji Minamoto]s",
              "underFilter": {
                "controller": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Koji Minamoto"
                    ],
                    "match": "name"
                  }
                ]
              }
            }
          ],
          "costOverride": 3,
          "ignoreRequirements": true
        }
      ],
      "isFromHand": true
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon",
                "Tamer"
              ]
            },
            "count": 1
          },
          "restriction": "suspend",
          "duration": "untilOpponentTurnEnd",
          "cost": {
            "kind": "return",
            "target": {
              "filter": {
                "controller": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Hybrid"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1
            },
            "raw": "By returning 1 card with the [Hybrid] trait from this Digimon's digivolution cards to the hand"
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
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 4
              }
            },
            "count": 1
          },
          "to": "hand",
          "condition": {
            "kind": "selfHasTrait",
            "filter": {
              "nameOrTrait": [
                {
                  "tokens": [
                    "Hybrid"
                  ],
                  "match": "trait"
                },
                {
                  "tokens": [
                    "Ten Warriors"
                  ],
                  "match": "trait"
                }
              ]
            },
            "raw": "this Digimon has the [Hybrid] or [Ten Warriors] trait"
          }
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT17-026", compiled);
export { compiled };
