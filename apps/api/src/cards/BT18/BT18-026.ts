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
                "Blue",
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
                      "Kumamon"
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
            "raw": "By placing 1 [Kumamon] and 1 [Korikakumon] from your trash under 1 of your blue or red Tamers, digivolve that Tamer into this card from your hand.",
            "underFilter": {
              "controller": "mine",
              "kind": [
                "Tamer"
              ],
              "colors": [
                "Blue",
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
                        "Korikakumon"
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
              "raw": "By placing 1 [Kumamon] and 1 [Korikakumon] from your trash under 1 of your blue or red Tamers, digivolve that Tamer into this card from your hand.",
              "underFilter": {
                "controller": "mine",
                "kind": [
                  "Tamer"
                ],
                "colors": [
                  "Blue",
                  "Red"
                ]
              },
              "destination": "digivolutionStack",
              "position": "bottom",
              "host": "target"
            }
          ],
          "raw": "By placing 1 [Kumamon] and 1 [Korikakumon] from your trash under 1 of your blue or red Tamers, digivolve that Tamer into this card from your hand."
        }
      ],
      "isFromHand": true
    },
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "IceClad",
          "raw": "＜Ice Clad＞"
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
              "digivolutionCards": "none",
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          }
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
  ],
  "ruleText": [
    "Trait: Has [Ice-Snow] type."
  ]
};

registerIrCard("BT18-026", compiled);
