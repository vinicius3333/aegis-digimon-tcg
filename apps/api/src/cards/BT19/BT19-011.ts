// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// DeleteByDPBudget: delete opponent Digimon whose total DP is within the budget.
// Budget starts at 3000, increases by 2000 per opponent Digimon on field at resolution.
// Inherited effect also adds 3000 to this card's DP deletion budget via AddToDPDeleteBudget.
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
          "kind": "DeleteByDPBudget",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"]
            },
            "count": "all"
          },
          "baseBudget": 3000,
          "budgetBonus": {
            "per": 2000,
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"]
            },
            "unit": "cards"
          }
        },
        {
          "kind": "GainMemory",
          "amount": 1,
          "scaling": {
            "per": 1,
            "filter": {
              "deletedByThisEffect": true,
              "kind": ["Digimon"]
            },
            "unit": "cards"
          }
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "DeleteByDPBudget",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"]
            },
            "count": "all"
          },
          "baseBudget": 3000,
          "budgetBonus": {
            "per": 2000,
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"]
            },
            "unit": "cards"
          }
        },
        {
          "kind": "GainMemory",
          "amount": 1,
          "scaling": {
            "per": 1,
            "filter": {
              "deletedByThisEffect": true,
              "kind": ["Digimon"]
            },
            "unit": "cards"
          }
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "AddToDPDeleteBudget",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "amount": 3000
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT19-011", compiled);
