// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for BT18-102 (Susanoomon).
// Fixes:
// 1. digivolutionRequirement adds requiredDigivolutionCardCount:{trait:'Hybrid',min:10}
//    (KB Q3055/Q3056 confirm it can still digivolve if >= 10 and cannot via Blast Digivolve).
//    New capability needed — see LANE_E.md: requiredDigivolutionCardCount.
// 2. CostModifier scaling filter now counts colors from zone:'digivolutionCards', not from
//    the Digimon itself (text: "For each color in this Digimon's digivolution cards").
// 3. Second WhenAttacking: cost places Tamer only (not Digimon+Tamer).
// 4. Second WhenAttacking: cost uses SecurityManipulation placeAsSecurity (bottom),
//    then trashSecurityTop scaled by number of placed cards.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Counter",
      "actions": [],
      "isFromHand": true,
      "keywords": [
        {
          "keyword": "BlastDigivolve",
          "raw": "＜Blast Digivolve＞"
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
              "kind": ["Digimon"],
              "dp": { "op": "lte", "value": 10000 }
            },
            "count": 1
          }
        },
        {
          "kind": "CostModifier",
          "mode": "raiseCeiling",
          "costType": "dpDeletion",
          "amount": 2000,
          "scaling": {
            "per": 1,
            "filter": {
              "zone": "digivolutionCards",
              "controllerDefault": "mine"
            },
            "unit": "colors"
          }
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"],
              "dp": { "op": "lte", "value": 10000 }
            },
            "count": 1
          }
        },
        {
          "kind": "CostModifier",
          "mode": "raiseCeiling",
          "costType": "dpDeletion",
          "amount": 2000,
          "scaling": {
            "per": 1,
            "filter": {
              "zone": "digivolutionCards",
              "controllerDefault": "mine"
            },
            "unit": "colors"
          }
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "placeAsSecurity",
          "controller": "mine",
          "source": {
            "filter": {
              "controller": "mine",
              "kind": ["Tamer"],
              "zone": "digivolutionCards"
            },
            "count": 5,
            "upTo": true
          },
          "toTop": false,
          "optional": true,
          "abortOnDecline": true,
          "raw": "By placing up to 5 Tamer cards from this Digimon's digivolution cards as your bottom security cards"
        },
        {
          "kind": "trashSecurityTop",
          "controller": "opponent",
          "scalingSource": "prevActionCount",
          "raw": "trash opponent's top security cards for each card placed by this effect"
        }
      ]
    },
    {
      "trigger": "Rule",
      "actions": [
        {
          "kind": "GrantStatic",
          "target": {
            "filter": { "isSelfRef": true },
            "count": 1,
            "isSelf": true
          },
          "grant": "trait",
          "tokens": ["Hybrid"]
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": ["Takuya Kanbara", "Koji Minamoto"],
      "cost": 6,
      "isAlternate": true,
      "requiredDigivolutionCardCount": { "trait": "Hybrid", "min": 10 },
      "incompatibleWithBlastDigivolve": true
    }
  ]
};

registerIrCard("BT18-102", compiled);
