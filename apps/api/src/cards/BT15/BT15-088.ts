// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
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
                "Tamer"
              ],
              "colors": [
                "Red"
              ],
              "playCostLte": 4
            },
            "count": 1
          },
          "from": [
            "hand"
          ],
          "payCost": false,
          "optional": true
        },
        {
          "kind": "Return",
          "target": {
            "filter": {
              "zone": "trash",
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Red"
              ]
            },
            "count": 1
          },
          "to": "hand",
          "condition": {
            "kind": "youHave",
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Tamer"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Sora Takenouchi"
                  ],
                  "match": "name"
                }
              ]
            },
            "raw": "you have a Tamer with [Sora Takenouchi] in its name"
          },
          "optional": true
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
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Biyomon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "hand",
            "trash"
          ],
          "payCost": false,
          "optional": true
        },
        {
          "kind": "AddToHandSelf"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT15-088", compiled);
export { compiled };
