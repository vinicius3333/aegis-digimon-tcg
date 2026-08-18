// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "ActivateMain",
          "target": {
            "filter": {
              "placedByThisEffect": true
            },
            "count": 1
          },
          "effectTrigger": "On Play",
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "excludeNames": [
                  "Sephirothmon"
                ],
                "controller": "mine",
                "levelComparison": {
                  "op": "lte",
                  "value": 4
                },
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Hybrid"
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
            "raw": "By placing 1 level 4 or lower card with the [Hybrid] trait other than [Sephirothmon] from your hand or trash as this Digimon's bottom digivolution card",
            "destination": "digivolutionStack",
            "position": "bottom",
            "host": "self"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "ActivateMain",
          "target": {
            "filter": {
              "placedByThisEffect": true
            },
            "count": 1
          },
          "effectTrigger": "On Play",
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "excludeNames": [
                  "Sephirothmon"
                ],
                "controller": "mine",
                "levelComparison": {
                  "op": "lte",
                  "value": 4
                },
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Hybrid"
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
            "raw": "By placing 1 level 4 or lower card with the [Hybrid] trait other than [Sephirothmon] from your hand or trash as this Digimon's bottom digivolution card",
            "destination": "digivolutionStack",
            "position": "bottom",
            "host": "self"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "OpponentsTurn",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "amount": 2000,
          "duration": "permanent"
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Mercurymon"
      ],
      "cost": 1,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT18-066", compiled);
