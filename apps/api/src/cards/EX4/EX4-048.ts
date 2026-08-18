// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Fixes:
// 1. [WhenDigivolving] Delete target: opponent Digimon with play cost >= 13.
// 2. [EndOfYourTurn] Digivolve into: Gaiomon card in hand with play cost >= 13.
// Q&A Q3492: "(Rule) Name: Also treated as having [Greymon]" semantics.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "GrantStatic",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "grant": "name",
          "tokens": [
            "Greymon"
          ]
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "costComparison": {
                "op": "gte",
                "value": 13
              }
            },
            "count": 1
          }
        },
        {
          "kind": "SecurityManipulation",
          "op": "trashTop",
          "controller": "opponent",
          "amount": 1,
          "condition": {
            "kind": "ifThisEffectDidNotDelete",
            "raw": "no Digimon was deleted by this effect"
          }
        }
      ]
    },
    {
      "trigger": "EndOfYourTurn",
      "actions": [
        {
          "kind": "Digivolve",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "into": {
            "controllerDefault": "mine",
            "nameOrTrait": [
              {
                "tokens": [
                  "Gaiomon"
                ],
                "match": "name"
              }
            ],
            "costComparison": {
              "op": "gte",
              "value": 13
            }
          },
          "payCost": false,
          "from": [
            "hand"
          ],
          "ignoreRequirements": true,
          "optional": true,
          "condition": {
            "kind": "youHave",
            "filter": {
              "zone": "battleArea",
              "controllerDefault": "mine",
              "kind": [
                "Tamer"
              ]
            },
            "raw": "you have a Tamer in play"
          }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX4-048", compiled);
