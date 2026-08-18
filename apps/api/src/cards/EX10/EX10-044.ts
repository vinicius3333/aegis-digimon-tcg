// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [On Play]: By placing 1 [Bagra Army] trait Digimon card from your hand or trash
//   under any of your Tamers, draw 1.
//   - place cost: from: ["hand","trash"], underFilter: any of your Tamers.
// [On Deletion]: You may play 1 [Tuwarmon] with play cost ≤7 from under your Tamers
//   without paying the cost. Then, <Save> (mandatory: no "you may").
//   - PlayWithoutCost: from: ["underTamers"].
//   - PlaceUnder: not optional.
// Inherited: whenTrashedFromDigivolutionCards → Draw 1.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
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
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Bagra Army"
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
            "underFilter": {
              "controller": "mine",
              "kind": [
                "Tamer"
              ]
            },
            "raw": "By placing 1 [Bagra Army] trait Digimon card from your hand or trash under any of your Tamers"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "OnDeletion",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "zone": "underTamers",
              "playCostLte": 7,
              "nameOrTrait": [
                {
                  "tokens": [
                    "Tuwarmon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "underTamers"
          ],
          "payCost": false,
          "optional": true
        },
        {
          "kind": "PlaceUnder",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "underFilter": {
            "controller": "mine",
            "kind": [
              "Tamer"
            ],
            "excludeToken": true
          }
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "onDigivolutionCardDiscarded",
          "actions": [
            {
              "kind": "Draw",
              "controller": "mine",
              "amount": 1
            }
          ]
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX10-044", compiled);
