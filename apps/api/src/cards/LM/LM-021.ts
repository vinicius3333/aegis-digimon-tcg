// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q4017: Delete any number of opponent's Digimon whose total DP ≤ this Digimon's DP.
// Must choose at least 1 (KB Q4018). Encoded as DeleteByDpBudget capability.
// KB Q4012-4015: the [Agumon] digivolve requires 2 or fewer security cards at resolution.
const compiled: CompiledCard = {
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
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"]
            },
            "count": "all",
            "totalDpCap": 14000
          },
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
              "kind": ["Digimon"]
            },
            "count": "all",
            "totalDpCap": 14000
          },
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "trashTop",
          "controller": "opponent",
          "amount": 1,
          "condition": {
            "kind": "youHave",
            "filter": {
              "controllerDefault": "mine",
              "kind": ["Tamer"]
            },
            "raw": "you have a Tamer"
          }
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": ["Agumon"],
      "cost": 3,
      "isAlternate": true,
      "condition": {
        "kind": "securityCountLte",
        "value": 2,
        "controller": "mine"
      }
    }
  ]
};

registerIrCard("LM-021", compiled);
