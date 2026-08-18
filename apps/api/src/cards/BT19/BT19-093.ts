// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for BT19-093 (Queen Device, Option card).
// Fixes:
// 1. Static effect only covers WaiveColorRequirement (the "While you don't have [Queen
//    Device]" passive). The -3000 DP static was incorrect — it was bundled wrongly.
// 2. Added missing "whenTrashedInBattleArea" SubTrigger effect: when an effect trashes
//    this card in the battle area, until end of opponent's turn, 1 opponent Digimon
//    gets -3000 DP and that Digimon can't activate [When Digivolving] effects.
//    KB Q3166 confirms duration is "until end of your opponent's turn".
// 3. Main effect: kept -3000 DP + Restrict cannotActivateWhenDigivolving + PlaceInBattleAreaSelf.
//    Using Restrict action (restriction:"cannotActivateWhenDigivolving") which exists in engine.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "WaiveColorRequirement",
          "target": {
            "filter": { "isSelfRef": true },
            "count": 1,
            "isSelf": true
          },
          "condition": {
            "kind": "youHaveNone",
            "filter": {
              "controllerDefault": "mine",
              "nameOrTrait": [
                {
                  "tokens": ["Queen Device"],
                  "match": "name"
                }
              ]
            },
            "raw": "you don't have [Queen Device]"
          }
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenTrashedByEffect",
          "sourceFilter": {
            "isSelfRef": true,
            "zone": "battleArea"
          },
          "actions": [
            {
              "kind": "ModifyDP",
              "target": {
                "filter": {
                  "controller": "opponent",
                  "kind": ["Digimon"]
                },
                "count": 1
              },
              "amount": -3000,
              "duration": "untilOpponentTurnEnd"
            },
            {
              "kind": "Restrict",
              "target": {
                "filter": {
                  "controller": "opponent",
                  "kind": ["Digimon"]
                },
                "count": 1
              },
              "restriction": "cannotActivateWhenDigivolving",
              "duration": "untilOpponentTurnEnd"
            }
          ]
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
              "controller": "opponent",
              "kind": ["Digimon"]
            },
            "count": 1
          },
          "amount": -3000,
          "duration": "untilOpponentTurnEnd"
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"]
            },
            "count": 1
          },
          "restriction": "cannotActivateWhenDigivolving",
          "duration": "untilOpponentTurnEnd"
        },
        {
          "kind": "PlaceInBattleAreaSelf"
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"]
            },
            "count": 2
          },
          "keyword": {
            "keyword": "SecurityAttack",
            "amount": -2,
            "raw": "＜Security Attack -2＞"
          },
          "duration": "forTheTurn"
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

registerIrCard("BT19-093", compiled);
