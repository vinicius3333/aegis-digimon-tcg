// @ts-nocheck
// HAND-FIXED IR — do not regenerate
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
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Negamon"
                  ],
                  "match": "text"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "hand"
          ],
          "payCost": true,
          "optional": true
        },
        {
          "kind": "Replacement",
          "event": "wouldBePlayed",
          "mode": "reduceCost",
          "amount": 2,
          "raw": "play 1 Digimon card with [Negamon] in its text from your hand with the play cost reduced by 2",
          "optional": true
        },
        {
          "kind": "Replacement",
          "event": "wouldBePlayed",
          "mode": "reduceCost",
          "amount": 1,
          "raw": "further reduce it by 1",
          "scaling": {
            "per": 1,
            "filter": {
              "zone": [
                "trash",
                "digivolutionCards"
              ],
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Negamon"
                  ],
                  "match": "text"
                }
              ]
            },
            "unit": "cards"
          }
        },
        {
          "kind": "PlaceUnder",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "underFilter": {
            "lastPlayed": true
          }
        }
      ],
      "isBreeding": true,
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "restriction": "digivolve",
          "duration": "permanent"
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "restriction": "beDeleted",
          "duration": "permanent"
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "restriction": "beTrashed",
          "duration": "permanent"
        }
      ],
      "isBreeding": true
    },
    {
      "trigger": "OpponentsTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenOpponentAttacks",
          "actions": [
            {
              "kind": "RedirectAttack",
              "target": {
                "filter": {
                  "controller": "mine",
                  "kind": [
                    "Digimon"
                  ],
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Negamon"
                      ],
                      "match": "text"
                    }
                  ]
                },
                "count": 1
              },
              "optional": true
            }
          ],
          "raw": "whenOpponentAttacks"
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX9-005", compiled);
