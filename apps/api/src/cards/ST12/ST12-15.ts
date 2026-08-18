// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";


const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "RevealAdd",
          "revealCount": 3,
          "add": [
            {
              "filter": {
                "controllerDefault": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Huckmon",
                      "Sistermon"
                    ],
                    "match": "name"
                  },
                  {
                    "tokens": [
                      "Royal Knight"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "to": "hand"
            }
          ],
          "rest": "trash"
        },
        {
          "kind": "PlaceInBattleAreaSelf"
        }
      ]
    },
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "CostModifier",
          "mode": "reduce",
          "costType": "digivolve",
          "amount": 1,
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": "all"
          },
          "duration": "forTheTurn",
          "once": true
        }
      ],
      "keywords": [
        {
          "keyword": "Delay",
          "raw": "＜Delay＞"
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "RevealAdd",
          "revealCount": 3,
          "add": [
            {
              "filter": {
                "controllerDefault": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Huckmon",
                      "Sistermon"
                    ],
                    "match": "name"
                  },
                  {
                    "tokens": [
                      "Royal Knight"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "to": "hand"
            }
          ],
          "rest": "trash"
        },
        {
          "kind": "PlaceInBattleAreaSelf"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("ST12-15", compiled);
