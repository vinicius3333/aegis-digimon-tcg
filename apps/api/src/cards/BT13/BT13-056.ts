// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controllerDefault": "mine",
              "colors": [
                "Green"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Royal Knight"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "payCost": true,
          "optional": true
        },
        {
          "kind": "Replacement",
          "event": "wouldBePlayed",
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [
            {
              "kind": "Replacement",
              "event": "wouldBePlayed",
              "mode": "reduceCost",
              "amount": 4,
              "raw": "reduce the play cost by 4"
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controllerDefault": "mine",
              "colors": [
                "Green"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Royal Knight"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "payCost": true,
          "optional": true
        },
        {
          "kind": "Replacement",
          "event": "wouldBePlayed",
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [
            {
              "kind": "Replacement",
              "event": "wouldBePlayed",
              "mode": "reduceCost",
              "amount": 4,
              "raw": "reduce the play cost by 4"
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenPlayed",
          "sourceFilter": {
            "controllerDefault": "mine",
            "excludeSelf": true,
            "kind": [
              "Digimon"
            ]
          },
          "actions": [
            {
              "kind": "GainKeyword",
              "target": {
                "filter": {
                  "controller": "mine",
                  "kind": [
                    "Digimon"
                  ],
                  "colors": [
                    "Green"
                  ],
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Royal Knight"
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
              "duration": "untilOpponentTurnEnd"
            }
          ]
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT13-056", compiled);
