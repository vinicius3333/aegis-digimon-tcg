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
              "controller": "mine",
              "kind": [
                "Tamer"
              ],
              "colors": [
                "Green",
                "Red"
              ]
            },
            "count": 1
          },
          "into": {
            "filter": {
              "isSelfRef": true
            }
          },
          "from": [
            "hand"
          ],
          "payCost": true,
          "costOverride": 3,
          "ignoreRequirements": true,
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "zone": "trash",
                "controller": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Kazemon"
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
            "raw": "By placing 1 [Kazemon] and 1 [Zephyrmon] from your trash under 1 of your green or red Tamers, that Tamer digivolves into this card for digivolution cost of 3, ignoring its digivolution requirements.",
            "underFilter": {
              "controller": "mine",
              "kind": [
                "Tamer"
              ],
              "colors": [
                "Green",
                "Red"
              ]
            },
            "destination": "digivolutionStack",
            "position": "bottom",
            "host": "target"
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
                        "Zephyrmon"
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
              "raw": "By placing 1 [Kazemon] and 1 [Zephyrmon] from your trash under 1 of your green or red Tamers, that Tamer digivolves into this card for digivolution cost of 3, ignoring its digivolution requirements.",
              "underFilter": {
                "controller": "mine",
                "kind": [
                  "Tamer"
                ],
                "colors": [
                  "Green",
                  "Red"
                ]
              },
              "destination": "digivolutionStack",
              "position": "bottom",
              "host": "target"
            }
          ],
          "raw": "By placing 1 [Kazemon] and 1 [Zephyrmon] from your trash under 1 of your green or red Tamers, that Tamer digivolves into this card for digivolution cost of 3, ignoring its digivolution requirements."
        }
      ],
      "isFromHand": true
    },
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Raid",
          "raw": "＜Raid＞"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Suspend",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon",
                "Tamer"
              ]
            },
            "count": 1
          }
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon", "Tamer"]
            },
            "count": 1,
            "sameTarget": true
          },
          "restriction": "unsuspend",
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "amount": 2000,
          "duration": "permanent"
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 4,
      "traits": [
        "Hybrid"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT18-053", compiled);
