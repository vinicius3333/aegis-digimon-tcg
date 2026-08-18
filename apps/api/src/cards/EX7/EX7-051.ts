// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "StartOfYourMainPhase",
      "actions": [
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 1,
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "controller": "mine",
                "kind": [
                  "Option"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Three Musketeers"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "from": [
                "hand",
                "trash"
              ]
            },
            "raw": "By placing 1 Option card with the [Three Musketeers] trait from your hand or trash as 1 of your Digimon's bottom digivolution card",
            "underFilter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "destination": "digivolutionStack",
            "position": "bottom",
            "host": "target"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "isInherited": true,
      "keywords": [
        {
          "keyword": "Retaliation",
          "raw": "＜Retaliation＞"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 2,
      "texts": [
        "Three Musketeers"
      ],
      "cost": 0,
      "isAlternate": true
    }
  ]
};

registerIrCard("EX7-051", compiled);
