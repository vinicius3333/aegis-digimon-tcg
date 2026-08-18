// @ts-nocheck
// Hand-authored: fix hatch to use Hatch action; add zone:breedingArea to Digivolve target.
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
          "keyword": "Blocker",
          "raw": "＜Blocker＞"
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Hatch",
          "optional": true
        },
        {
          "kind": "Digivolve",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "zone": "breedingArea",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Avian",
                    "Bird"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "into": {
            "controllerDefault": "mine",
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
                  "Avian",
                  "Bird"
                ],
                "match": "trait"
              }
            ]
          },
          "payCost": false,
          "from": [
            "hand"
          ],
          "optional": true
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Hatch",
          "optional": true
        },
        {
          "kind": "Digivolve",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "zone": "breedingArea",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Avian",
                    "Bird"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "into": {
            "controllerDefault": "mine",
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
                  "Avian",
                  "Bird"
                ],
                "match": "trait"
              }
            ]
          },
          "payCost": false,
          "from": [
            "hand"
          ],
          "optional": true
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenDeletesInBattle",
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
              "optional": true
            }
          ]
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT24-048", compiled);
