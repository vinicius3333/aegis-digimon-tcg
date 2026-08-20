// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for EX5-072 (Holy Beasts Great Cardinal Positions).
// runtime-effect fixes:
// - [Static] cost reduction: text says "when this card would be used, reduce the cost by 1
//   for each [Deva]/[Four Sovereigns] card with a different name in your trash". The trigger
//   should be a Replacement on wouldBePlayed (option-use), not a Static ReducePlayCost.
//   Also the scaling filter needs uniqueByName:true to count each distinct card name once.
//   (Requires new engine cap CAP-C-20: uniqueByName on scaling filter.)
//   KB Q3685: this card itself does NOT count when computing the reduction.
// - [Static] WaiveColorRequirement preserved (you have a [Deva]/[Four Sovereigns] Digimon).
// - [Main] PlayWithoutCost: corrected target filter from name:"Fanglongmon" (wrong prop) to
//   nameOrTrait with match:"name" and tokens:["Fanglongmon"] (substring match).
// - [Security] Return: zone:"trash" was already present in the original — preserved.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "WaiveColorRequirement",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "condition": {
            "kind": "youHave",
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Deva",
                    "Four Sovereigns"
                  ],
                  "match": "trait"
                }
              ]
            },
            "raw": "you have a Digimon with the [Deva]/[Four Sovereigns] trait"
          }
        }
      ]
    },
    {
      "trigger": "BeforePayCost",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldBePlayed",
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [
            {
              "kind": "Replacement",
              "event": "wouldBePlayed",
              "mode": "reduceCost",
              "scaling": {
                "per": 1,
                "filter": {
                  "zone": "trash",
                  "controller": "mine",
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Deva",
                        "Four Sovereigns"
                      ],
                      "match": "trait"
                    }
                  ],
                  "uniqueByName": true,
                  "excludeSelf": true
                },
                "unit": "cards"
              },
              "raw": "reduce the cost by 1 for each [Deva]/[Four Sovereigns] trait card with a different name in your trash"
            }
          ]
        }
      ]
    },
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Fanglongmon"
                  ],
                  "match": "name"
                }
              ],
              "source": "hand"
            },
            "count": 1,
            "upTo": true
          },
          "from": [
            "hand"
          ],
          "payCost": false,
          "optional": true
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "Return",
          "target": {
            "filter": {
              "zone": "trash",
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Fanglongmon"
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
          "kind": "AddToHandSelf"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX5-072", compiled);
