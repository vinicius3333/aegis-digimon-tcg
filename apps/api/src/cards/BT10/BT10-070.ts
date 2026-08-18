// @ts-nocheck
// Hand-corrected IR (was AUTO-GENERATED): the [On Play] Blitz gate "this Digimon has 3
// digivolution cards" was left raw (raw conditions never pass). source documented behavior checks
// DigivolutionCards.Count >= 3 (KB Q1994: 4+ also activates) => selfDigivolutionCountAtLeast 3.
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
          "keyword": "Rush",
          "raw": "＜Rush＞"
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "keyword": {
            "keyword": "Blitz",
            "raw": "＜Blitz＞"
          },
          "duration": "permanent",
          "condition": {
            "kind": "selfDigivolutionCountAtLeast",
            "value": 3
          }
        }
      ]
    },
    {
      "trigger": "OpponentsTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenOpponentAttacks",
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
              "cost": {
                "kind": "trash",
                "target": {
                  "filter": {
                    "zone": "digivolutionCards"
                  },
                  "count": 1
                },
                "raw": "by trashing 1 of this Digimon's digivolution cards"
              }
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT10-070", compiled);
