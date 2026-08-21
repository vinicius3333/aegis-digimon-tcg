// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Counter",
      "actions": [],
      "isFromHand": true,
      "keywords": [
        {
          "keyword": "BlastDigivolve",
          "raw": "＜Blast Digivolve＞"
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "TrashDigivolution",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": "all"
          },
          "amount": 99
        },
        {
          "kind": "Modal",
          "choose": 1,
          "options": [
            [
              {
                "kind": "Return",
                "target": {
                  "filter": {
                    "zone": "trash",
                    "controller": "mine"
                  },
                  "count": "all"
                },
                "to": "deckBottom",
                "bindResultAs": "returnedTrashCards"
              }
            ],
            [
              {
                "kind": "Return",
                "target": {
                  "filter": {
                    "zone": "trash",
                    "controller": "opponent"
                  },
                  "count": "all"
                },
                "to": "deckBottom",
                "bindResultAs": "returnedTrashCards"
              }
            ]
          ]
        },
        {
          "kind": "GainMemory",
          "amount": 3,
          "condition": {
            "kind": "bindingContains",
            "ref": "returnedTrashCards",
            "filter": {
              "kind": [
                "Digimon"
              ],
              "colors": [
                "White"
              ],
              "levelComparison": {
                "op": "eq",
                "value": 7
              }
            },
            "raw": "this effect returned a white level 7 card"
          }
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "TrashDigivolution",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": "all"
          },
          "amount": 99
        },
        {
          "kind": "Modal",
          "choose": 1,
          "options": [
            [
              {
                "kind": "Return",
                "target": {
                  "filter": {
                    "zone": "trash",
                    "controller": "mine"
                  },
                  "count": "all"
                },
                "to": "deckBottom",
                "bindResultAs": "returnedTrashCards"
              }
            ],
            [
              {
                "kind": "Return",
                "target": {
                  "filter": {
                    "zone": "trash",
                    "controller": "opponent"
                  },
                  "count": "all"
                },
                "to": "deckBottom",
                "bindResultAs": "returnedTrashCards"
              }
            ]
          ]
        },
        {
          "kind": "GainMemory",
          "amount": 3,
          "condition": {
            "kind": "bindingContains",
            "ref": "returnedTrashCards",
            "filter": {
              "kind": [
                "Digimon"
              ],
              "colors": [
                "White"
              ],
              "levelComparison": {
                "op": "eq",
                "value": 7
              }
            },
            "raw": "this effect returned a white level 7 card"
          }
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "cost": {
            "kind": "return",
            "to": "deckBottom",
            "target": {
              "filter": {
                "digivolutionCards": "none",
                "controller": "opponent",
                "kind": [
                  "Digimon"
                ]
              },
              "count": 1
            },
            "raw": "By returning 1 of your opponent's Digimon with no digivolution cards to the bottom of the deck"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 6,
      "names": [
        "Imperialdramon"
      ],
      "cost": 5,
      "isAlternate": true
    }
  ],
  "ruleText": [
    "Trait: Has [Free] type."
  ]
};

registerIrCard("BT17-077", compiled);
