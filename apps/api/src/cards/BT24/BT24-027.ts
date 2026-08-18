// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Decode",
          "raw": "＜Decode ([Calmaramon])＞"
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Blue"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "TS"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "restriction": "beDeletedInBattle",
          "duration": "untilOpponentTurnEnd",
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "zone": "hand",
                "controller": "mine",
                "kind": [
                  "Digimon"
                ],
                "colors": [
                  "Blue"
                ],
                "levelComparison": {
                  "op": "lte",
                  "value": 4
                },
                "nameOrTrait": [
                  {
                    "tokens": [
                      "TS"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "from": [
                "hand"
              ]
            },
            "raw": "By placing 1 level 4 or lower blue [TS] trait Digimon card from your hand as this Digimon's bottom digivolution card",
            "destination": "digivolutionStack",
            "position": "bottom",
            "host": "self"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Blue"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "TS"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "restriction": "beDeletedInBattle",
          "duration": "untilOpponentTurnEnd",
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "zone": "hand",
                "controller": "mine",
                "kind": [
                  "Digimon"
                ],
                "colors": [
                  "Blue"
                ],
                "levelComparison": {
                  "op": "lte",
                  "value": 4
                },
                "nameOrTrait": [
                  {
                    "tokens": [
                      "TS"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "from": [
                "hand"
              ]
            },
            "raw": "By placing 1 level 4 or lower blue [TS] trait Digimon card from your hand as this Digimon's bottom digivolution card",
            "destination": "digivolutionStack",
            "position": "bottom",
            "host": "self"
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
          "kind": "Draw",
          "controller": "mine",
          "amount": 1,
          "condition": {
            "kind": "zoneCount",
            "seat": "mine",
            "zone": "hand",
            "op": "lte",
            "value": 7,
            "raw": "you have 7 or fewer cards in your hand"
          }
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
      "names": [
        "Calmaramon"
      ],
      "cost": 0,
      "isAlternate": true
    },
    {
      "level": 3,
      "traits": [
        "TS"
      ],
      "cost": 2,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT24-027", compiled);
