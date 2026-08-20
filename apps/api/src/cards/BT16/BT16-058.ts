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
          "keyword": "Collision",
          "raw": "＜Collision＞"
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 1,
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "zone": "hand",
                "controller": "mine"
              },
              "count": 1
            },
            "raw": "By trashing 1 card in your hand"
          },
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "GrantAuraToOpponents",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "effectText": "[Start of Your Main Phase] This Digimon attacks.",
          "condition": {
            "kind": "selfDigivolutionStackHasTrait",
            "filter": {
              "nameOrTrait": [
                {
                  "tokens": [
                    "SoC"
                  ],
                  "match": "trait"
                }
              ]
            },
            "raw": "a Tamer card with the [SoC] trait is in this Digimon's digivolution cards"
          },
          "optional": true,
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 1,
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "zone": "hand",
                "controller": "mine"
              },
              "count": 1
            },
            "raw": "By trashing 1 card in your hand"
          },
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "GrantAuraToOpponents",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "effectText": "[Start of Your Main Phase] This Digimon attacks.",
          "condition": {
            "kind": "selfDigivolutionStackHasTrait",
            "filter": {
              "nameOrTrait": [
                {
                  "tokens": [
                    "SoC"
                  ],
                  "match": "trait"
                }
              ]
            },
            "raw": "a Tamer card with the [SoC] trait is in this Digimon's digivolution cards"
          },
          "optional": true,
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "amount": 1000,
          "duration": "permanent"
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Dorumon"
      ],
      "cost": 2,
      "isAlternate": true
    },
    {
      "level": 3,
      "traits": [
        "SoC"
      ],
      "cost": 2,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT16-058", compiled);
export { compiled };
