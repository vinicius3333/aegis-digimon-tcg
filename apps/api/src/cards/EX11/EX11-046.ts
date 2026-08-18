// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
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
            "count": "all",
            "except": {
              "filter": {
                "controller": "opponent",
                "kind": [
                  "Digimon"
                ]
              },
              "count": 1,
              "selector": "highestPlayCost"
            }
          }
        },
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "keywords": [
            {
              "keyword": "Blocker",
              "raw": "＜Blocker＞"
            },
            {
              "keyword": "EffectImmunity",
              "raw": "isn't affected by their effects"
            }
          ],
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "digivolutionCardCount",
            "nameOrTrait": [
              {
                "tokens": [
                  "Vemmon"
                ],
                "match": "name"
              }
            ],
            "op": "gte",
            "value": 4
          }
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
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
            "count": "all",
            "except": {
              "filter": {
                "controller": "opponent",
                "kind": [
                  "Digimon"
                ]
              },
              "count": 1,
              "selector": "highestPlayCost"
            }
          }
        },
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "keywords": [
            {
              "keyword": "Blocker",
              "raw": "＜Blocker＞"
            },
            {
              "keyword": "EffectImmunity",
              "raw": "isn't affected by their effects"
            }
          ],
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "digivolutionCardCount",
            "nameOrTrait": [
              {
                "tokens": [
                  "Vemmon"
                ],
                "match": "name"
              }
            ],
            "op": "gte",
            "value": 4
          }
        }
      ]
    },
    {
      "trigger": "EndOfOpponentsTurn",
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
            "controllerDefault": "mine",
            "names": [
              "Galacticmon"
            ]
          },
          "from": [
            "hand",
            "trash"
          ],
          "payCost": false,
          "ignoreRequirements": true,
          "optional": true
        }
      ]
    }
  ],
  "coverage": "partial",
  "residual": [
    "digivolutionCardCount condition kind and EffectImmunity keyword need engine support"
  ],
  "digivolutionRequirement": [
    {
      "names": [
        "Snatchmon"
      ],
      "cost": 9,
      "isAlternate": true
    },
    {
      "names": [
        "Galacticmon"
      ],
      "cost": 5,
      "isAlternate": true
    }
  ]
};

registerIrCard("EX11-046", compiled);
