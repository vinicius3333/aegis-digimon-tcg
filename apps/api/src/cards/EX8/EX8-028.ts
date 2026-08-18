// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "IceClad",
          "raw": "＜Ice Clad＞"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Barrier",
          "raw": "＜Barrier＞"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 4
              },
              "nameOrTrait": [
                {
                  "tokens": [
                    "Ice-Snow"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "hand"
          ],
          "payCost": false,
          "optional": true
        },
        {
          "kind": "CostModifier",
          "mode": "raiseCeiling",
          "costType": "level",
          "amount": 1,
          "scaling": {
            "per": 1,
            "filter": {
              "digivolutionCards": "none",
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "unit": "cards"
          }
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "digivolutionCards": "none",
                "controllerDefault": "mine",
                "kind": [
                  "Digimon"
                ]
              },
              "count": 1
            },
            "raw": "By placing 1 Digimon with no digivolution cards as the bottom security card",
            "destination": "security",
            "position": "bottom",
            "faceDown": true
          },
          "optional": true,
          "abortOnDecline": true
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "digivolutionCards": "none",
                "controllerDefault": "mine",
                "kind": [
                  "Digimon"
                ]
              },
              "count": 1
            },
            "raw": "By placing 1 Digimon with no digivolution cards as the bottom security card",
            "destination": "security",
            "position": "bottom",
            "faceDown": true
          },
          "optional": true,
          "abortOnDecline": true
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 5,
      "traits": [
        "Ice-Snow"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("EX8-028", compiled);
