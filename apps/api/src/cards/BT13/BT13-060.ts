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
            "name": "Rosemon"
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
                    "Yoshino Fujieda"
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
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon",
                "Tamer"
              ]
            },
            "count": "all"
          }
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "trashTop",
          "controller": "opponent",
          "amount": 1,
          "scaling": {
            "per": 2,
            "filter": {
              "controller": "opponent",
              "suspended": true,
              "kind": [
                "Digimon",
                "Tamer"
              ]
            },
            "unit": "cards"
          }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Rosemon",
        "Yoshino Fujieda"
      ],
      "cost": 0,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT13-060", compiled);
