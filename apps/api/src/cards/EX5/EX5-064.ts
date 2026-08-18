// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX5-064 Koh & Sayo
// Text: "[Start of Your Turn] If you have 2 memory or less, set your memory to 3."
// Text: "[On Play][Main] By suspending this Tamer AND placing the top card of one of your
//   [Light Fang]/[Night Claw] trait Digimon as that Digimon's bottom digivolution card,
//   1 of your Digimon may digivolve into a Digimon card in your hand without paying the cost."
// KB Q3668: the Digimon that digivolves can be different from the one whose top card was placed
// KB Q5212/Q5393: if this card itself is placed as the bottom card, the inherited effect is gone
// Fix: encode compound cost (suspend + PlaceTopDigivolutionAsBottom); new capability in LANE_E.md
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "StartOfYourTurn",
      "actions": [
        {
          "kind": "SetMemory",
          "value": 3,
          "condition": {
            "kind": "memoryAtMost",
            "value": 2
          }
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Digivolve",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "into": {
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ]
          },
          "payCost": false,
          "from": [
            "hand"
          ],
          "optional": true,
          "cost": {
            "kind": "compound",
            "costs": [
              {
                "kind": "suspend",
                "target": {
                  "filter": {
                    "isSelfRef": true
                  },
                  "count": 1,
                  "isSelf": true
                }
              },
              {
                "kind": "PlaceTopDigivolutionAsBottom",
                "target": {
                  "filter": {
                    "controller": "mine",
                    "zone": "battleArea",
                    "kind": [
                      "Digimon"
                    ],
                    "nameOrTrait": [
                      {
                        "tokens": [
                          "Light Fang",
                          "Night Claw"
                        ],
                        "match": "trait"
                      }
                    ]
                  },
                  "count": 1
                }
              }
            ],
            "raw": "By suspending this Tamer and placing the top card of one of your [Light Fang]/[Night Claw] trait Digimon as that Digimon's bottom digivolution card"
          },
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "Digivolve",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "into": {
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ]
          },
          "payCost": false,
          "from": [
            "hand"
          ],
          "optional": true,
          "cost": {
            "kind": "compound",
            "costs": [
              {
                "kind": "suspend",
                "target": {
                  "filter": {
                    "isSelfRef": true
                  },
                  "count": 1,
                  "isSelf": true
                }
              },
              {
                "kind": "PlaceTopDigivolutionAsBottom",
                "target": {
                  "filter": {
                    "controller": "mine",
                    "zone": "battleArea",
                    "kind": [
                      "Digimon"
                    ],
                    "nameOrTrait": [
                      {
                        "tokens": [
                          "Light Fang",
                          "Night Claw"
                        ],
                        "match": "trait"
                      }
                    ]
                  },
                  "count": 1
                }
              }
            ],
            "raw": "By suspending this Tamer and placing the top card of one of your [Light Fang]/[Night Claw] trait Digimon as that Digimon's bottom digivolution card"
          },
          "abortOnDecline": true
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
  "coverage": "partial",
  "residual": [
    "PlaceTopDigivolutionAsBottom cost kind not yet in interpreter (see LANE_E.md)"
  ]
};

registerIrCard("EX5-064", compiled);
