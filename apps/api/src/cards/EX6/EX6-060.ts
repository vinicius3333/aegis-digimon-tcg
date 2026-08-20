// @ts-nocheck
// HAND-FIXED — do not regenerate.
// Suspend-trash cost modeling: trash-cost drives suspend (scaling residual; count:1 max approx).
// AllTurns Replacement: otherThanBattle leaveCause, breeding area underFilter zone,
// KB Q3802 excludeSelf on target (this Digimon not yet in trash when effect fires).
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "zone": "hand"
            },
            "count": 3,
            "upTo": true
          },
          "optional": true,
          "trackCount": "trashedCards"
        },
        {
          "kind": "RepeatPerCount",
          "countSource": "trashedCards",
          "action": {
            "kind": "Suspend",
            "target": {
              "filter": {
                "controller": "opponent",
                "unsuspended": true,
                "kind": [
                  "Digimon"
                ],
                "levelComparison": {
                  "op": "lte",
                  "value": 5
                }
              },
              "count": 1
            }
          }
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "suspended": true,
              "kind": [
                "Digimon"
              ],
              "superlative": "lowestPlayCost"
            },
            "count": "all"
          }
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "zone": "hand"
            },
            "count": 3,
            "upTo": true
          },
          "optional": true,
          "trackCount": "trashedCards"
        },
        {
          "kind": "RepeatPerCount",
          "countSource": "trashedCards",
          "action": {
            "kind": "Suspend",
            "target": {
              "filter": {
                "controller": "opponent",
                "kind": [
                  "Digimon"
                ],
                "levelComparison": {
                  "op": "lte",
                  "value": 5
                }
              },
              "count": 1
            }
          }
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "suspended": true,
              "kind": [
                "Digimon"
              ],
              "superlative": "lowestPlayCost"
            },
            "count": "all"
          }
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldLeavePlay",
          "leaveCause": "otherThanBattle",
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [
            {
              "kind": "PlaceUnder",
              "target": {
                "filter": {
                  "controller": "mine",
                  "zone": "trash",
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Seven Great Demon Lords"
                      ],
                      "match": "trait"
                    }
                  ]
                },
                "from": [
                  "trash"
                ],
                "count": 1
              },
              "underFilter": {
                "controller": "mine",
                "zone": "breedingArea",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Gate of Deadly Sins"
                    ],
                    "match": "name"
                  }
                ]
              },
              "position": "bottom"
            }
          ]
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Belphemon: Sleep Mode"
      ],
      "cost": 1,
      "isAlternate": true
    }
  ]
};
registerIrCard("EX6-060", compiled);
