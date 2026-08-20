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
          "kind": "Modal",
          "choose": 1,
          "options": [
            [
              {
                "kind": "PlayWithoutCost",
                "target": {
                  "filter": {
                    "name": "Fujitsumon",
                    "isToken": true
                  },
                  "count": 1
                },
                "payCost": false,
                "suspend": true,
                "controller": "self"
              }
            ],
            [
              {
                "kind": "PlayToken",
                "target": {
                  "filter": {
                    "name": "Fujitsumon",
                    "isToken": true
                  },
                  "count": 1
                },
                "to": "opponentBattleArea",
                "suspend": true,
                "controller": "self",
                "asOpponentDigimon": true
              }
            ]
          ],
          "condition": {
            "kind": "countCompare",
            "count": {
              "kind": "count",
              "filter": {
                "type": "Digimon",
                "zone": [
                  "battleArea"
                ],
                "includeTokens": true
              },
              "controller": "both"
            },
            "operator": ">=",
            "value": 4
          },
          "elseCondition": {
            "kind": "countCompare",
            "count": {
              "kind": "count",
              "filter": {
                "type": "Digimon",
                "zone": [
                  "battleArea"
                ],
                "includeTokens": true
              },
              "controller": "both"
            },
            "operator": "<=",
            "value": 3
          }
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Modal",
          "choose": 1,
          "options": [
            [
              {
                "kind": "PlayWithoutCost",
                "target": {
                  "filter": {
                    "name": "Fujitsumon",
                    "isToken": true
                  },
                  "count": 1
                },
                "payCost": false,
                "suspend": true,
                "controller": "self"
              }
            ],
            [
              {
                "kind": "PlayToken",
                "target": {
                  "filter": {
                    "name": "Fujitsumon",
                    "isToken": true
                  },
                  "count": 1
                },
                "to": "opponentBattleArea",
                "suspend": true,
                "controller": "self",
                "asOpponentDigimon": true
              }
            ]
          ],
          "condition": {
            "kind": "countCompare",
            "count": {
              "kind": "count",
              "filter": {
                "type": "Digimon",
                "zone": [
                  "battleArea"
                ],
                "includeTokens": true
              },
              "controller": "both"
            },
            "operator": ">=",
            "value": 4
          },
          "elseCondition": {
            "kind": "countCompare",
            "count": {
              "kind": "count",
              "filter": {
                "type": "Digimon",
                "zone": [
                  "battleArea"
                ],
                "includeTokens": true
              },
              "controller": "both"
            },
            "operator": "<=",
            "value": 3
          }
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenPlayed",
          "sourceFilter": {
            "controller": "opponent",
            "zone": "battleArea",
            "kind": [
              "Digimon"
            ],
            "byEffect": true
          },
          "actions": [
            {
              "kind": "GainMemory",
              "amount": 1
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

registerIrCard("EX5-058", compiled);
