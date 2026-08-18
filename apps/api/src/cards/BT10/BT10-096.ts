// Hand-authored override — do not regenerate.
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
          "kind": "SelectBind",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "gte",
                "value": 4
              },
              "nameOrTrait": [
                {
                  "tokens": [
                    "Shoutmon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1,
            "bindAs": "selected"
          }
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "relativeTo": {
                "selectionRef": "selected",
                "attr": "dp",
                "op": "lte"
              }
            },
            "count": 1
          }
        }
      ]
    },
    {
      "trigger": "Security",
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
                      "Xros Heart"
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
                      "Taiki Kudo"
                    ],
                    "match": "name"
                  }
                ]
              },
              "count": 1,
              "to": "play"
            }
          ],
          "rest": "deckBottom",
          "optional": true
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT10-096", compiled);
