// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "zone": "hand",
              "controller": "mine",
              "colors": [
                "Blue"
              ]
            },
            "count": 2,
            "upTo": true
          },
          "optional": true
        },
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon",
                "Tamer"
              ],
              "hasDigivolutionCards": true
            },
            "count": 1,
            "upTo": true
          },
          "optional": true,
          "scaling": {
            "per": 1,
            "filter": {
              "controllerDefault": "mine"
            },
            "unit": "cards"
          }
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon",
                "Tamer"
              ],
              "digivolutionCards": "none"
            },
            "count": 1
          },
          "restriction": "suspend",
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "EndOfAttack",
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
            "target": {
              "filter": {
                "zone": "trash",
                "controller": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Jellymon"
                    ],
                    "match": "text"
                  }
                ]
              },
              "count": 3
            },
            "raw": "By returning 3 cards with [Jellymon] in their texts from your trash to the bottom of the deck in any order"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("RB1-014", compiled);
