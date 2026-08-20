// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "RevealAdd",
          "revealCount": 3,
          "add": [
            {
              // "1 Tamer card OR 1 level 4 or lower black card": two independent branches. As one
              // filter it demanded all three at once — a black Tamer of level 4 or lower — and a
              // Tamer carries no level, so nothing could ever be placed.
              "filter": {
                "controllerDefault": "mine",
                "kind": [
                  "Tamer"
                ]
              },
              "orFilters": [
                {
                  "controllerDefault": "mine",
                  "colors": [
                    "Black"
                  ],
                  "levelComparison": {
                    "op": "lte",
                    "value": 4
                  }
                }
              ],
              "count": 1,
              "to": "placeUnder",
              "optional": true
            }
          ],
          "rest": "deckTopOrBottom"
        }
      ]
    },
    {
      "trigger": "EndOfOpponentsTurn",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Tamer"
              ]
            },
            "count": 1
          },
          "from": [
            "digivolutionCards"
          ],
          "payCost": false,
          "optional": true
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "Aura",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "effect": {
            "kind": "keyword",
            "keyword": {
              "keyword": "Collision",
              "raw": "＜Collision＞"
            }
          },
          "while": {
            "kind": "selfHasTrait", "filter": {"nameOrTrait": [{"tokens": ["Machine"], "match": "trait"}]},
            "raw": "this Digimon has the [Machine] trait"
          }
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT18-061", compiled);
