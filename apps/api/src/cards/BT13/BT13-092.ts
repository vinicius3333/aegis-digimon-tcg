// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
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
            "name": "Ravemon"
          },
          "payCost": false,
          "reduceCost": 0
        },
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controllerDefault": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Keenan Crier"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "to": "hand"
        },
        {
          "kind": "TrashDigivolution",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "amount": 1,
          "position": "top"
        },
        { "kind": "SecurityManipulation", "op": "addTop", "controller": "opponent", "condition": { "kind": "zoneCount", "seat": "opponent", "zone": "hand", "op": "lte", "value": 7, "raw": "they have 7 or fewer cards in their hand" } }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": "all"
          },
          "cost": {
            "kind": "return",
            "target": {
              "filter": {
                "zone": "trash",
                "controller": "opponent",
                "kind": [
                  "Digimon"
                ]
              },
              "count": 1
            },
            "raw": "By returning 1 Digimon card from your opponent's trash to the bottom of the deck"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Ravemon",
        "Keenan Crier"
      ],
      "cost": 0,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT13-092", compiled);
