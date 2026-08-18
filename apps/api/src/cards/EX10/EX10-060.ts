// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q5170-Q5171 (binding):
//   - Multiple effects trigger simultaneously on digivolve; player chooses order.
//   - The [Once Per Turn] effect counts toward its limit even if the opponent didn't delete.
// [On Play][When Digivolving] cost: play 1 [Lucemon: Larva] from trash to EMPTY breeding area
//   without cost — structured as PlayWithoutCost cost with zone:breedingArea + emptyBreedingArea.
// [When Digivolving][When Attacking]: opponent may delete 1 of their Digimon OR Tamers (kind fixed);
//   if no delete occurred → trash opponent's top security card AND unsuspend self.
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
              ],
              "superlative": "highestLevel"
            },
            "count": "all"
          },
          "cost": {
            "kind": "playWithoutCost",
            "target": {
              "filter": {
                "controller": "mine",
                "zone": "trash",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Lucemon: Larva"
                    ],
                    "match": "name"
                  }
                ]
              },
              "count": 1
            },
            "to": "breedingArea",
            "requireEmptyBreedingArea": true,
            "raw": "By playing 1 [Lucemon: Larva] from your trash to your empty breeding area without paying the cost"
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
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "superlative": "highestLevel"
            },
            "count": "all"
          },
          "cost": {
            "kind": "playWithoutCost",
            "target": {
              "filter": {
                "controller": "mine",
                "zone": "trash",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Lucemon: Larva"
                    ],
                    "match": "name"
                  }
                ]
              },
              "count": 1
            },
            "to": "breedingArea",
            "requireEmptyBreedingArea": true,
            "raw": "By playing 1 [Lucemon: Larva] from your trash to your empty breeding area without paying the cost"
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
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon",
                "Tamer"
              ]
            },
            "count": 1
          },
          "optional": true,
          "controller": "opponent"
        },
        {
          "kind": "SecurityManipulation",
          "op": "trashTop",
          "controller": "opponent",
          "amount": 1,
          "condition": {
            "kind": "ifThisEffectDidNotDelete",
            "raw": "this effect didn't delete"
          }
        },
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "condition": {
            "kind": "ifThisEffectDidNotDelete",
            "raw": "this effect didn't delete"
          }
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon",
                "Tamer"
              ]
            },
            "count": 1
          },
          "optional": true,
          "controller": "opponent"
        },
        {
          "kind": "SecurityManipulation",
          "op": "trashTop",
          "controller": "opponent",
          "amount": 1,
          "condition": {
            "kind": "ifThisEffectDidNotDelete",
            "raw": "this effect didn't delete"
          }
        },
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "condition": {
            "kind": "ifThisEffectDidNotDelete",
            "raw": "this effect didn't delete"
          }
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Lucemon: Chaos Mode"
      ],
      "cost": 6,
      "isAlternate": true
    }
  ]
};

registerIrCard("EX10-060", compiled);
