import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "StartOfYourMainPhase",
      "actions": [
        {
          "kind": "GainMemory",
          "amount": 1,
          "condition": {
            "kind": "youHave",
            "filter": {
              "zone": "battleArea",
              "controllerDefault": "mine",
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Blue"
              ]
            },
            "raw": "you have a blue Digimon in play"
          }
        },
        {
          "kind": "GainMemory",
          "amount": 1,
          "condition": {
            "kind": "youHave",
            "filter": {
              "zone": "battleArea",
              "controllerDefault": "mine",
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Green"
              ]
            },
            "raw": "you have a green Digimon in play"
          }
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenOneOfYoursDigivolves",
          "raw": "when one of your Digimon digivolves into a Digimon with 2 or more colors",
          "sourceFilter": {
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ],
            "multicolor": true
          },
          "actions": [
            {
              "kind": "Unsuspend",
              "target": {
                "sourceRef": "triggerSubject",
                "filter": {},
                "count": 1
              },
              "cost": {
                "kind": "suspend",
                "target": {
                  "filter": {
                    "isSelfRef": true
                  },
                  "count": 1,
                  "isSelf": true
                },
                "raw": "by suspending this Tamer"
              },
              "optional": true
            }
          ]
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "payCost": false
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT8-088", compiled);
