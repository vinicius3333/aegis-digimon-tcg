// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "MaterialSave",
          "amount": 2,
          "raw": "＜Material Save 2＞"
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 2
        }
      ]
    },
    {
      "trigger": "EndOfAttack",
      "optional": true,
      "condition": {
        "kind": "selfDigivolutionCountAtLeast",
        "value": 1,
        "raw": "this Digimon has at least 1 digivolution card"
      },
      "actions": [
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Tamer"
              ]
            },
            "count": 1
          },
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "controller": "mine",
                "hostFilter": {
                  "isSelfRef": true
                }
              },
              "count": "all",
              "from": [
                "digivolutionCards"
              ]
            },
            "raw": "By placing all digivolution cards from under this Digimon under 1 of your Tamers",
            "underFilter": {
              "controller": "mine",
              "kind": [
                "Tamer"
              ]
            }
          },
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digiXrosRequirement": [
    {
      "materials": [
        {
          "names": [
            "Shoutmon"
          ]
        },
        {
          "names": [
            "Ballistamon"
          ]
        },
        {
          "names": [
            "Dorulumon"
          ]
        },
        {
          "names": [
            "Starmons"
          ]
        }
      ],
      "count": 2
    }
  ]
};

registerIrCard("BT10-009", compiled);
