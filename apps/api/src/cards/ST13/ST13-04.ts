// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// ST13-04 Duramon
// [Your Turn] When this Digimon would digivolve into a card in your hand that's
//   black or has [Legend-Arms] in its traits, reduce the digivolution cost by 1.
// [Inherited][End of Your Turn] You may DNA digivolve this Digimon and one of
//   your other Digimon in play into a Digimon card in your hand for its DNA
//   digivolve cost.
//
// Q&A (Q770): The inherited effect fires before the opponent's turn starts;
//   DNA digivolves with one other Digimon in play.
// Q&A (Q771): Cannot DNA digivolve into a card without a DNA digivolve requirement.
// Q&A (Q772): Must use the Digimon specified by the DNA digivolution requirement.
//
// Fixes vs prior IR:
// - [Your Turn] Replacement: kept as-is (correct nested reduceCost pattern matching
//   BT3-031 pattern; outer gates target, inner reduces).
// - [End of Your Turn] DnaDigivolve: materials is now an array of two Targets
//   (self + one other Digimon excluding self); into filter adds hasDnaDigivolutionRequirement
//   and zone:'hand'; into is a filter wrapping (not a nested object).
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldDigivolve",
          "sourceFilter": {
            "isSelfRef": true
          },
          "into": {
            "or": [
              {
                "colors": [
                  "Black"
                ]
              },
              {
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Legend-Arms"
                    ],
                    "match": "trait"
                  }
                ]
              }
            ],
            "zone": "hand",
            "controller": "mine"
          },
          "actions": [
            {
              "kind": "Replacement",
              "event": "wouldDigivolve",
              "mode": "reduceCost",
              "amount": 1,
              "raw": "reduce the digivolution cost by 1"
            }
          ]
        }
      ]
    },
    {
      "trigger": "EndOfYourTurn",
      "actions": [
        {
          "kind": "DnaDigivolve",
          "materials": [
            {
              "filter": {
                "isSelfRef": true
              },
              "count": 1,
              "isSelf": true
            },
            {
              "filter": {
                "controller": "mine",
                "kind": [
                  "Digimon"
                ],
                "zone": "battleArea",
                "excludeSelf": true
              },
              "count": 1
            }
          ],
          "into": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "zone": "hand",
              "hasDnaDigivolutionRequirement": true
            },
            "count": 1
          },
          "payCost": true,
          "optional": true
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("ST13-04", compiled);
