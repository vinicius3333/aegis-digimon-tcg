// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
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
                "op": "lte",
                "value": 4
              }
            },
            "count": 1
          },
          "condition": {
            "kind": "zoneCount",
            "seat": "opponent",
            "zone": "hand",
            "op": "lte",
            "value": 5,
            "raw": "your opponent has 5 or fewer cards in their hand"
          }
        },
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "zone": "hand",
              "controllerDefault": "mine"
            },
            "count": 1
          },
          "condition": {
            "kind": "zoneCount",
            "seat": "opponent",
            "zone": "hand",
            "op": "gte",
            "value": 7,
            "raw": "they have 7 or more cards in their hand"
          }
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
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
                "op": "lte",
                "value": 4
              }
            },
            "count": 1
          },
          "condition": {
            "kind": "zoneCount",
            "seat": "opponent",
            "zone": "hand",
            "op": "lte",
            "value": 5,
            "raw": "your opponent has 5 or fewer cards in their hand"
          }
        },
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "zone": "hand",
              "controllerDefault": "mine"
            },
            "count": 1
          },
          "condition": {
            "kind": "zoneCount",
            "seat": "opponent",
            "zone": "hand",
            "op": "gte",
            "value": 7,
            "raw": "they have 7 or more cards in their hand"
          }
        }
      ]
    },
    {
      "trigger": "OnDeletion",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "DanDevimon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "trash"
          ],
          "payCost": false,
          "condition": {
            "kind": "zoneCount",
            "seat": "opponent",
            "zone": "trash",
            "op": "gte",
            "value": 10,
            "raw": "your opponent has 10 or more cards in their trash"
          },
          "optional": true
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "controller": "opponent",
              "zone": "hand"
            },
            "count": 1
          },
          "optional": true,
          "controller": "opponent"
        },
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Purple"
              ],
              "levels": [
                3
              ]
            },
            "count": 1
          },
          "from": [
            "trash"
          ],
          "payCost": false,
          "condition": {
            "kind": "ifThisEffectDidNotAct",
            "raw": "they don't"
          },
          "optional": true
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX6-051", compiled);
