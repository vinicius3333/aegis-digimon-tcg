// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "StartOfYourMainPhase",
      "actions": [
        {
          "kind": "GainMemory",
          "amount": 1,
          "condition": {
            "kind": "youHave",
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Guilmon",
                    "Growlmon",
                    "Gallantmon"
                  ],
                  "match": "name"
                }
              ]
            },
            "raw": "you have a Digimon with [Guilmon]/[Growlmon]/[Gallantmon] in its name"
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
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Guilmon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "into": {
            "controllerDefault": "mine",
            "nameOrTrait": [
              {
                "tokens": [
                  "Gallantmon"
                ],
                "match": "name"
              }
            ]
          },
          "payCost": false,
          "from": [
            "hand"
          ],
          "ignoreRequirements": true,
          "optional": true,
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "isSelfRef": true
              },
              "count": 1,
              "isSelf": true
            },
            "raw": "By placing this Tamer and 1 [Growlmon] and 1 [WarGrowlmon] from your trash as the bottom digivolution cards of 1 of your [Guilmon]",
            "underFilter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Guilmon"
                  ],
                  "match": "name"
                }
              ]
            },
            "destination": "digivolutionStack",
            "position": "bottom",
            "host": "target"
          },
          "abortOnDecline": true,
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
                        "Growlmon"
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
              "raw": "By placing this Tamer and 1 [Growlmon] and 1 [WarGrowlmon] from your trash as the bottom digivolution cards of 1 of your [Guilmon]",
              "underFilter": {
                "controller": "mine",
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Guilmon"
                    ],
                    "match": "name"
                  }
                ]
              },
              "destination": "digivolutionStack",
              "position": "bottom",
              "host": "target"
            },
            {
              "kind": "place",
              "target": {
                "filter": {
                  "zone": "trash",
                  "controller": "mine",
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "WarGrowlmon"
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
              "raw": "By placing this Tamer and 1 [Growlmon] and 1 [WarGrowlmon] from your trash as the bottom digivolution cards of 1 of your [Guilmon]",
              "underFilter": {
                "controller": "mine",
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Guilmon"
                    ],
                    "match": "name"
                  }
                ]
              },
              "destination": "digivolutionStack",
              "position": "bottom",
              "host": "target"
            }
          ]
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "payCost": false
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT17-080", compiled);
