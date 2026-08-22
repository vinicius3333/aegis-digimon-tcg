// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "RevealAdd",
          "revealCount": 4,
          "add": [
            {
              "filter": {
                "controllerDefault": "mine",
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Evil",
                      "Wizard"
                    ],
                    "match": "trait"
                  },
                  {
                    "tokens": [
                      "Demon Lord"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "to": "hand"
            }
          ],
          "rest": "deckBottom"
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenOneOfYoursDigivolves",
          "sourceFilter": {
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ],
            "colors": [
              "Purple"
            ]
          },
          "cost": {
            "kind": "suspend",
            "target": {
              "filter": { "isSelfRef": true },
              "count": 1,
              "isSelf": true
            },
            "raw": "suspend this Tamer"
          },
          "additionalCost": {
            "kind": "return",
            "target": {
              "filter": { "zone": "hand", "controller": "mine" },
              "count": 1
            },
            "to": "deckTop",
            "raw": "return 1 card from your hand to your deck"
          },
          "optional": true,
          "raw": "suspend this Tamer and return 1 card from your hand to your deck to gain 1 memory",
          "actions": [
            {
              "kind": "GainMemory",
              "amount": 1
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

registerIrCard("ST14-11", compiled);
