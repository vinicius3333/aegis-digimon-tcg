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
      "actions": [],
      "keywords": [
        {
          "keyword": "Decode",
          "raw": "＜Decode (Lv.3 w/[Aqua]/[Sea Animal] in any trait)＞"
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "PlaceUnder",
          "target": {
            "filter": {
              "zone": "hand",
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 5
              },
              "nameOrTrait": [
                {
                  "tokens": [
                    "Aqua",
                    "Sea Animal"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1,
            "from": [
              "hand"
            ]
          },
          "underFilter": {
            "controller": "mine",
            "kind": [
              "Digimon"
            ]
          },
          "optional": true
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "PlaceUnder",
          "target": {
            "filter": {
              "zone": "hand",
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 5
              },
              "nameOrTrait": [
                {
                  "tokens": [
                    "Aqua",
                    "Sea Animal"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1,
            "from": [
              "hand"
            ]
          },
          "underFilter": {
            "controller": "mine",
            "kind": [
              "Digimon"
            ]
          },
          "optional": true
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "isInherited": true,
      "keywords": [
        {
          "keyword": "Jamming",
          "raw": "＜Jamming＞"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT22-021", compiled);
