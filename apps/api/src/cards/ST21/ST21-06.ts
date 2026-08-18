// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// ST21-06 MagnaAngemon
// [Digivolve] Lv.4 w/[ADVENTURE] trait: Cost 3
// [On Play][When Digivolving] Place 1 of your opponent's ≤6000 DP Digimon as the top
//   security card. For every 2 colors your Tamers have, add 2000 to this effect's DP max.
// [Your Turn][Once Per Turn] When your other Digimon are played or digivolve,
//   if any of them have the [ADVENTURE] trait, 1 of your Digimon gains <Alliance> for
//   the turn. Then, 1 of your Digimon may attack.
// [Inherited] <Alliance>
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "CostModifier",
          "mode": "raiseCeiling",
          "costType": "dp",
          "amount": 2000,
          "scaling": {
            "per": 2,
            "filter": {
              "controller": "mine",
              "kind": [
                "Tamer"
              ]
            },
            "unit": "colors"
          }
        },
        {
          "kind": "SecurityManipulation",
          "op": "placeAsSecurity",
          "controller": "opponent",
          "source": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "dp": {
                "op": "lte",
                "value": 6000
              }
            },
            "count": 1
          },
          "toTop": true
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "CostModifier",
          "mode": "raiseCeiling",
          "costType": "dp",
          "amount": 2000,
          "scaling": {
            "per": 2,
            "filter": {
              "controller": "mine",
              "kind": [
                "Tamer"
              ]
            },
            "unit": "colors"
          }
        },
        {
          "kind": "SecurityManipulation",
          "op": "placeAsSecurity",
          "controller": "opponent",
          "source": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "dp": {
                "op": "lte",
                "value": 6000
              }
            },
            "count": 1
          },
          "toTop": true
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenPlayed",
          "sourceFilter": {
            "controller": "mine",
            "excludeSelf": true,
            "kind": [
              "Digimon"
            ]
          },
          "actions": [
            {
              "kind": "GainKeyword",
              "target": {
                "filter": {
                  "controller": "mine",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1
              },
              "keyword": {
                "keyword": "Alliance",
                "raw": "＜Alliance＞"
              },
              "duration": "forTheTurn",
              "condition": {
                "kind": "raw",
                "raw": "any of them have the [ADVENTURE] trait"
              }
            },
            {
              "kind": "Attack",
              "target": {
                "filter": {
                  "controller": "mine",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1
              },
              "withoutSuspending": false,
              "optional": true
            }
          ]
        },
        {
          "kind": "SubTrigger",
          "event": "whenOneOfYoursDigivolves",
          "sourceFilter": {
            "controller": "mine",
            "excludeSelf": true,
            "kind": [
              "Digimon"
            ]
          },
          "actions": [
            {
              "kind": "GainKeyword",
              "target": {
                "filter": {
                  "controller": "mine",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1
              },
              "keyword": {
                "keyword": "Alliance",
                "raw": "＜Alliance＞"
              },
              "duration": "forTheTurn",
              "condition": {
                "kind": "raw",
                "raw": "any of them have the [ADVENTURE] trait"
              }
            },
            {
              "kind": "Attack",
              "target": {
                "filter": {
                  "controller": "mine",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1
              },
              "withoutSuspending": false,
              "optional": true
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "Static",
      "actions": [],
      "isInherited": true,
      "keywords": [
        {
          "keyword": "Alliance",
          "raw": "＜Alliance＞"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 4,
      "traits": [
        "ADVENTURE"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("ST21-06", compiled);
