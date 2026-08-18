// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": -3000,
          "duration": "forTheTurn"
        },
        {
          "kind": "DnaDigivolve",
          "materials": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 2
          },
          "into": {
            "controllerDefault": "mine",
            "nameOrTrait": [
              {
                "tokens": [
                  "Silphymon"
                ],
                "match": "name"
              }
            ]
          },
          "payCost": true,
          "condition": {
            "kind": "isYourTurn",
            "raw": "it's your turn"
          },
          "optional": true
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": -3000,
          "duration": "forTheTurn"
        },
        {
          "kind": "DnaDigivolve",
          "materials": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 2
          },
          "into": {
            "controllerDefault": "mine",
            "nameOrTrait": [
              {
                "tokens": [
                  "Silphymon"
                ],
                "match": "name"
              }
            ]
          },
          "payCost": true,
          "condition": {
            "kind": "isYourTurn",
            "raw": "it's your turn"
          },
          "optional": true
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "isInherited": true,
      "keywords": [
        {
          "keyword": "Barrier",
          "raw": "＜Barrier＞"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 3,
      "traits": [
        "TS"
      ],
      "cost": 2,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT24-035", compiled);
