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
          "keyword": "Evade",
          "raw": "＜Evade＞"
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "optional": true
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon",
                "Tamer"
              ]
            },
            "count": 1
          },
          "restriction": "unsuspend",
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "optional": true
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon",
                "Tamer"
              ]
            },
            "count": 1
          },
          "restriction": "unsuspend",
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "excludeNameOrTrait": [
                {
                  "tokens": [
                    "Sea Animal"
                  ],
                  "match": "trait"
                }
              ],
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "dp": {
                "op": "lte",
                "value": 4000
              },
              "nameOrTrait": [
                {
                  "tokens": [
                    "Iliad"
                  ],
                  "match": "trait"
                },
                {
                  "tokens": [
                    "Beast",
                    "Animal",
                    "Sovereign"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "hand"
          ],
          "payCost": false,
          "optional": true
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 4,
      "names": [
        "Garurumon"
      ],
      "cost": 3,
      "isAlternate": true
    },
    {
      "traits": [
        "TS"
      ],
      "cost": 3,
      "isAlternate": true,
      "level": 4
    }
  ]
};

registerIrCard("BT24-050", compiled);
