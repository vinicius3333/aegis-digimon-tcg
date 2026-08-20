// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "GrantStatic",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "grant": "name",
          "tokens": [
            "Omnimon"
          ],
          "condition": {
            "kind": "triggerRevealedFromDeck",
            "raw": "this card is revealed from the deck"
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
              "excludeSelf": true,
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
            ],
            "colors": [
              "Black"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Greymon",
                  "Garurumon"
                ],
                "match": "name"
              }
            ]
          },
          "from": [
            "hand"
          ],
          "reduceCost": 2,
          "optional": true,
          "condition": {
            "kind": "isYourTurn",
            "raw": "it's your turn"
          }
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "DeDigivolve",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": 1,
          "stopAtLevel": 3
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT15-060", compiled);
export { compiled };
