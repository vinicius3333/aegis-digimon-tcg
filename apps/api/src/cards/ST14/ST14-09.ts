// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldBePlayed",
          "sourceFilter": {
            "controllerDefault": "mine"
          },
          "actions": [
            {
              "kind": "Replacement",
              "event": "wouldBePlayed",
              "mode": "reduceCost",
              "amount": 4,
              "raw": "reduce the play cost by 4"
            }
          ],
          "scaling": {
            "per": 10,
            "filter": {
              "zone": "trash",
              "controller": "mine"
            },
            "unit": "trash"
          }
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "onDiscardLibrary",
          "sourceFilter": { "controller": "mine" },
          "actions": [
            {
              "kind": "PlayWithoutCost",
              "target": {
                "filter": {
                  "controller": "mine",
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Impmon"
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
              "optional": true,
              "bindResultAs": "playedImpmon"
            }
          ]
        },
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "boundRef": "playedImpmon",
              "kind": ["Digimon"]
            },
            "count": 1
          },
          "keyword": {
            "keyword": "Rush",
            "raw": "＜Rush＞"
          },
          "duration": "forTheTurn"
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "OpponentsTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenOpponentAttacks",
          "actions": [
            {
              "kind": "Trash",
              "target": {
                "filter": {
                  "controller": "mine"
                },
                "count": 1
              }
            }
          ]
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("ST14-09", compiled);
