// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Counter",
      "actions": [],
      "isFromHand": true,
      "keywords": [
        {
          "keyword": "BlastDigivolve",
          "raw": "＜Blast Digivolve＞"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Scapegoat",
          "raw": "＜Scapegoat＞"
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 4
              },
              "nameOrTrait": [
                {
                  "tokens": [
                    "DM"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "trash"
          ],
          "payCost": false,
          "optional": true
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 4
              },
              "nameOrTrait": [
                {
                  "tokens": [
                    "DM"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "trash"
          ],
          "payCost": false,
          "optional": true
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Ver.4"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": "all"
          },
          "keyword": {
            "keyword": "Blocker",
            "raw": "＜Blocker＞"
          },
          "duration": "permanent"
        },
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Ver.4"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": "all"
          },
          "keyword": {
            "keyword": "Retaliation",
            "raw": "＜Retaliation＞"
          },
          "duration": "permanent"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 5,
      "traits": [
        "DM"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("EX9-065", compiled);
