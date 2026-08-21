// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
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
                "Purple",
                "Yellow"
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
                      "Loweemon"
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
            "raw": "By placing 1 [Loweemon] and 1 [KaiserLeomon] from your trash under 1 of your purple or yellow Tamers, digivolve that Tamer into this card from your hand.",
            "underFilter": {
              "controller": "mine",
              "kind": [
                "Tamer"
              ],
              "colors": [
                "Purple",
                "Yellow"
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
                        "KaiserLeomon"
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
              "raw": "By placing 1 [Loweemon] and 1 [KaiserLeomon] from your trash under 1 of your purple or yellow Tamers, digivolve that Tamer into this card from your hand.",
              "underFilter": {
                "controller": "mine",
                "kind": [
                  "Tamer"
                ],
                "colors": [
                  "Purple",
                  "Yellow"
                ]
              },
              "destination": "digivolutionStack",
              "position": "bottom",
              "host": "target"
            }
          ],
          "raw": "By placing 1 [Loweemon] and 1 [KaiserLeomon] from your trash under 1 of your purple or yellow Tamers, digivolve that Tamer into this card from your hand."
        }
      ],
      "isFromHand": true
    },
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Jamming",
          "raw": "＜Jamming＞"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "hasInheritedEffects": true,
              "controller": "mine",
              "kind": [
                "Tamer"
              ]
            },
            "count": 1
          },
          "from": [
            "trash"
          ],
          "payCost": false,
          "optional": true
        }
      ]
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
        "Hybrid"
      ],
      "cost": 3,
      "isAlternate": true,
      "baseColors": [
        "Purple",
        "Yellow"
      ]
    }
  ]
};

registerIrCard("BT18-081", compiled);
