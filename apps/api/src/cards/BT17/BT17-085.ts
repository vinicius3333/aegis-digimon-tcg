// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "StartOfYourMainPhase",
      "actions": [
        {
          "kind": "GainMemory",
          "amount": 1,
          "condition": {
            "kind": "opponentHas",
            "filter": {
              "controllerDefault": "opponent",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [{ "tokens": ["Renamon"], "match": "name" }]
            },
            "raw": "your opponent has a Digimon"
          }
        }
      ]
    },
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "Digivolve",
          "target": {
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [{ "tokens": ["Renamon"], "match": "name" }]
            },
            "count": 1
          },
          "into": {
            "controllerDefault": "mine",
            "nameOrTrait": [
              {
                "tokens": [
                  "Sakuyamon"
                ],
                "match": "name"
              }
            ]
          },
          "payCost": true,
          "from": [
            "hand"
          ],
          "costOverride": 4,
          "ignoreRequirements": true,
          "optional": true,
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "isSelfRef": true
              },
              "count": 1,
              "isSelf": true,
              "from": [
                "trash"
              ]
            },
            "raw": "By placing this Tamer and 1 [Kyubimon] and 1 [Taomon] from your trash in any order as the bottom digivolution cards of one of your [Renamon]",
            "underFilter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Renamon"
                  ],
                  "match": "name"
                }
              ]
            },
            "destination": "digivolutionStack",
            "position": "bottom",
            "host": "target"
          },
          "abortOnDecline": true,
          "additionalCosts": [
            {
              "kind": "place",
              "target": { "filter": { "zone": "trash", "controller": "mine", "nameOrTrait": [{ "tokens": ["Kyubimon"], "match": "name" }] }, "count": 1, "from": ["trash"] },
              "underFilter": { "controller": "mine", "kind": ["Digimon"], "nameOrTrait": [{ "tokens": ["Renamon"], "match": "name" }] },
              "destination": "digivolutionStack",
              "position": "bottom",
              "host": "target"
            },
            {
              "kind": "place",
              "target": { "filter": { "zone": "trash", "controller": "mine", "nameOrTrait": [{ "tokens": ["Taomon"], "match": "name" }] }, "count": 1, "from": ["trash"] },
              "underFilter": { "controller": "mine", "kind": ["Digimon"], "nameOrTrait": [{ "tokens": ["Renamon"], "match": "name" }] },
              "destination": "digivolutionStack",
              "position": "bottom",
              "host": "target"
            }
          ]
        },
        {
          "kind": "Return",
          "target": {
            "filter": {
              "zone": "trash",
              "controller": "mine",
              "kind": [
                "Option"
              ]
            },
            "count": 1
          },
          "to": "hand",
          "condition": {
            "kind": "ifThisEffectDigivolved",
            "raw": "digivolved by this effect"
          },
          "optional": true
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

registerIrCard("BT17-085", compiled);
