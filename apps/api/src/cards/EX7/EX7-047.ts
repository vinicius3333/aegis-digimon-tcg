// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [On Play][When Digivolving]: "play up to 7 play cost's total worth" uses
// totalPlayCostBudget:7 (not a card count). New capability — see LANE_E.md.
// [End of Your Turn]: DnaDigivolve into [NSp] card must be from hand per text.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Blocker",
          "raw": "＜Blocker＞"
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "RevealAdd",
          "revealCount": 4,
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
                      "NSp"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": "all",
              "totalPlayCostBudget": 7,
              "to": "play",
              "optional": true
            }
          ],
          "rest": "deckBottom"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "RevealAdd",
          "revealCount": 4,
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
                      "NSp"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": "all",
              "totalPlayCostBudget": 7,
              "to": "play",
              "optional": true
            }
          ],
          "rest": "deckBottom"
        }
      ]
    },
    {
      "trigger": "EndOfYourTurn",
      "actions": [
        {
          "kind": "DnaDigivolve",
          "materials": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 2
          },
          "into": {
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "NSp"
                ],
                "match": "trait"
              }
            ],
            "zone": "hand"
          },
          "payCost": true,
          "optional": true
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 5,
      "traits": [
        "NSP"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("EX7-047", compiled);
