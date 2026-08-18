// @ts-nocheck
// HAND-FIXED IR for BT19-081 — do not regenerate.
// KB Q3142/Q3143/Q3144: the [All Turns] effect allows placing cards from under any of your
// Tamers as DigiXros materials when a [Blue Flare] trait Digimon with DigiXros requirements
// would be played (not just from hand/battle area).
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "StartOfYourMainPhase",
      "actions": [
        {
          "kind": "GainMemory",
          "amount": 1,
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "controller": "mine",
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Blue Flare",
                      "Xros Heart"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1
            },
            "underFilter": {
              "controller": "mine",
              "kind": [
                "Tamer"
              ]
            },
            "raw": "By placing 1 Digimon card with the [Blue Flare]/[Xros Heart] trait from your hand under any of your Tamers"
          }
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldBePlayed",
          "sourceFilter": {
            "controller": "mine",
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Blue Flare"
                ],
                "match": "trait"
              }
            ],
            "hasDigiXrosRequirements": true
          },
          "actions": [
            {
              "kind": "PlaceUnder",
              "target": {
                "filter": {
                  "controller": "mine",
                  "zone": "underTamer"
                },
                "count": "any"
              },
              "underFilter": {
                "isTriggerSource": true
              },
              "asDigiXrosMaterial": true,
              "cost": {
                "kind": "suspend",
                "target": {
                  "filter": {
                    "isSelfRef": true
                  },
                  "count": 1,
                  "isSelf": true
                },
                "raw": "by suspending this Tamer"
              },
              "optional": true
            }
          ]
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "payCost": false
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT19-081", compiled);
