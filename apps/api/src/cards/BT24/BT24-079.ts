// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for BT24-079 (Hadesmon).
// [When Digivolving] play level 4 or lower [System]/[Life] Digimon from trash without cost;
// then you may link 1 [Appmon] card from hand or this Digimon's digi-stack without cost.
// [All Turns] [Once Per Turn] When OTHER Digimon (either player's) are deleted, you may
// activate 1 of THIS Digimon's [When Digivolving] effects.
// KB Q5659: cannot link a card without <Link>.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Overclock",
          "raw": "＜Overclock ([Appmon] Trait)＞"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Link",
          "amount": 1,
          "raw": "＜Link +1＞"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 4
              },
              "nameOrTrait": [
                {
                  "tokens": [
                    "System",
                    "Life"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "trash"
          ],
          "payCost": false,
          "optional": true
        },
        {
          // Link 1 [Appmon] card from hand or this Digimon's digi-stack to 1 of your Digimon.
          // KB Q5659: cannot link a card that doesn't have <Link>.
          "kind": "Link",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": ["Digimon"],
              "nameOrTrait": [
                {
                  "tokens": ["Appmon"],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "from": ["hand", "digivolutionCards"],
          "to": {
            "filter": {
              "controller": "mine",
              "kind": ["Digimon"]
            },
            "count": 1
          },
          "payCost": false,
          "optional": true
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "onDeletionOf",
          // "other Digimon" = any Digimon (either player's) except this Digimon
          "sourceFilter": {
            "excludeSelf": true,
            "kind": ["Digimon"]
          },
          "actions": [
            {
              // Activate 1 of THIS Digimon's [When Digivolving] effects
              "kind": "ReactivateEffect",
              "fromTrigger": "WhenDigivolving",
              "count": 1,
              "optional": true
            }
          ],
          "raw": "When other Digimon are deleted, you may activate 1 of this Digimon's [When Digivolving] effects"
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "appFusionRequirement": [
    {
      "names": [
        "Revivemon",
        "Biomon"
      ],
      "cost": 0
    }
  ]
};

registerIrCard("BT24-079", compiled);
