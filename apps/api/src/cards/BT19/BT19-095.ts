// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q3170 (binding): when trashed in the battle area, the 2nd effect lasts
// until the end of your opponent's turn (untilOpponentTurnEnd), regardless of
// whose turn caused the trashing.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "WaiveColorRequirement",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "condition": {
            "kind": "youHaveNone",
            "filter": {
              "controllerDefault": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Knight Device"
                  ],
                  "match": "name"
                }
              ]
            },
            "raw": "you don't have [Knight Device]"
          }
        }
      ]
    },
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": 4000,
          "duration": "forTheTurn"
        },
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "keyword": {
            "keyword": "Piercing",
            "raw": "＜Piercing＞"
          },
          "duration": "forTheTurn"
        },
        {
          "kind": "PlaceInBattleAreaSelf"
        }
      ]
    },
    {
      "trigger": "whenTrashedFromBattleArea",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": 4000,
          "duration": "untilOpponentTurnEnd"
        },
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "keyword": {
            "keyword": "Piercing",
            "raw": "＜Piercing＞"
          },
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "Suspend",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon",
                "Tamer"
              ]
            },
            "count": 2
          }
        },
        {
          "kind": "AddToHandSelf"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT19-095", compiled);
