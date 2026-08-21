// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored implementation for EX5-072 (Holy Beasts Great Cardinal Positions).
// The option cost counts distinct [Deva]/[Four Sovereigns] names in its owner's trash;
// its Main and Security effects target Fanglongmon Digimon cards.
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
            "kind": [
              "Digimon"
            ],
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
              "kind": [
                "Digimon"
              ],
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
