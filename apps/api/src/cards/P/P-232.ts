// @ts-nocheck
// Hand-fixed: [Yuuki] sourceFilter uses match:trait (not name);
// Digivolve action is inside the SubTrigger as the <Delay> payload.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "RevealAdd",
          "revealCount": 3,
          "add": [
            {
              "filter": {
                "controllerDefault": "mine",
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Evil",
                      "Dark Dragon",
                      "Evil Dragon"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "to": "hand"
            },
            {
              "filter": {
                "controllerDefault": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "LIBERATOR"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "to": "hand"
            }
          ],
          "rest": "deckBottom"
        },
        {
          "kind": "PlaceInBattleAreaSelf"
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenPlayed",
          "sourceFilter": {
            "controller": "mine",
            "nameOrTrait": [
              {
                "tokens": [
                  "Yuuki"
                ],
                "match": "trait"
              }
            ]
          },
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
                "levelComparison": {
                  "op": "lte",
                  "value": 6
                },
                "nameOrTrait": [
                  {
                    "tokens": [
                      "LIBERATOR"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "from": [
                "hand",
                "trash"
              ],
              "reduceCost": 3,
              "optional": true
            }
          ],
          "keywords": [
            {
              "keyword": "Delay",
              "raw": "＜Delay＞"
            }
          ]
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "ActivateMain"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};
registerIrCard("P-232", compiled);
