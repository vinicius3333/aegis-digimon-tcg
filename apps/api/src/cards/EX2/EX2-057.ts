// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX2-057 Kenta Kitagawa
// Text: [Your Turn] When you would play a [MarineAngemon] from your hand, reduce its play cost by 1.
// Text: [Your Turn] When you play a blue Digimon, you may suspend this Tamer to trash the bottom
//   digivolution card of 1 of your opponent's Digimon. Then, if the Digimon played is [MarineAngemon],
//   trash the bottom digivolution card of all of your opponent's Digimon.
// Text: [Security] Play this card without paying the cost.
// Fixes:
//   - First YourTurn Replacement: sourceFilter was missing [MarineAngemon] name restriction
//   - Second YourTurn: "then all-trash" should be INSIDE the SubTrigger (gated on Blue being played),
//     not a sibling action — moved inside SubTrigger's actions as a condition-gated follow-up
//   - The all-opponent trash is only reachable if the player suspended (sequential: if you don't
//     suspend, abortOnDecline stops the sequence)
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldBePlayed",
          "sourceFilter": {
            "controllerDefault": "mine",
            "nameOrTrait": [
              {
                "tokens": [
                  "MarineAngemon"
                ],
                "match": "name"
              }
            ]
          },
          "actions": [
            {
              "kind": "Replacement",
              "event": "wouldBePlayed",
              "mode": "reduceCost",
              "amount": 1,
              "raw": "reduce its play cost by 1"
            }
          ]
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
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ],
            "colors": [
              "Blue"
            ]
          },
          "actions": [
            {
              "kind": "TrashDigivolution",
              "target": {
                "filter": {
                  "controller": "opponent",
                  "kind": [
                    "Digimon"
                  ],
                  "digivolutionCards": "hasAny"
                },
                "count": 1
              },
              "amount": 1,
              "fromTop": false,
              "cost": {
                "kind": "suspend",
                "target": {
                  "filter": {
                    "isSelfRef": true
                  },
                  "count": 1,
                  "isSelf": true
                },
                "raw": "by suspending this Tamer"
              },
              "optional": true,
              "abortOnDecline": true
            },
            {
              "kind": "TrashDigivolution",
              "target": {
                "filter": {
                  "controller": "opponent",
                  "kind": [
                    "Digimon"
                  ],
                  "digivolutionCards": "hasAny"
                },
                "count": "all"
              },
              "amount": 1,
              "fromTop": false,
              "condition": {
                "kind": "triggerSubjectMatchesFilter",
                "filter": {
                  "nameOrTrait": [{ "tokens": ["MarineAngemon"], "match": "name" }]
                }
              }
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

registerIrCard("EX2-057", compiled);
