// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenOneOfYoursDigivolves",
          "sourceFilter": {
            "controllerDefault": "mine",
            "nameOrTrait": [
              {
                "tokens": [
                  "Belphemon (X Antibody)"
                ],
                "match": "name"
              }
            ]
          },
          "actions": [
            {
              "kind": "ActivateMain",
              "cost": {
                "kind": "return",
                "target": {
                  "filter": {
                    "isSelfRef": true
                  },
                  "count": 1,
                  "isSelf": true
                },
                "raw": "by returning this card to the bottom of the deck"
              },
              "optional": true,
              "abortOnDecline": true
            }
          ]
        }
      ],
      "isFromTrash": true
    },
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "gte",
                "value": 0,
                "scaling": {
                  "per": 1,
                  "filter": {
                    "controllerDefault": "mine",
                    "zone": "hand"
                  },
                  "unit": "cards"
                }
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
          "kind": "ActivateMain"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT23-097", compiled);
