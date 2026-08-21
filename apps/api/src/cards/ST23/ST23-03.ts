// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// ST23-03 Cougarmon
// [Digivolve] Lv.3 w/[Glowing Dawn] trait: Cost 2
// [On Play] [When Digivolving] Add your top security card to the hand. Then, <Recovery +1>
//   (Q6165: if 0 security, skip the add-to-hand step and just do Recovery +1)
// [Your Turn] When this Digimon would digivolve into a [Glowing Dawn] trait Digimon card,
//   by trashing the bottom face-down card from under any of your Tamers, reduce the cost by 2.
// [Inherited] <Barrier>
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "toHand",
          "controller": "mine",
          "amount": 1,
          "toTop": true
        },
        {
          "kind": "SecurityManipulation",
          "op": "addTop",
          "controller": "mine",
          "source": "deck",
          "amount": 1
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "toHand",
          "controller": "mine",
          "amount": 1,
          "toTop": true
        },
        {
          "kind": "SecurityManipulation",
          "op": "addTop",
          "controller": "mine",
          "source": "deck",
          "amount": 1
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldDigivolve",
          "mode": "reduceCost",
          "amount": 2,
          "sourceFilter": {
            "isSelfRef": true
          },
          "into": {
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Glowing Dawn"
                ],
                "match": "trait"
              }
            ]
          },
          "cost": {
            "kind": "trashBottomFaceDownUnderTamer",
            "controller": "mine",
            "raw": "by trashing the bottom face-down card from under any of your Tamers"
          },
          "raw": "reduce the cost by 2"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "isInherited": true,
      "keywords": [
        {
          "keyword": "Barrier",
          "raw": "＜Barrier＞"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 3,
      "traits": [
        "Glowing Dawn"
      ],
      "cost": 2,
      "isAlternate": true
    }
  ]
};

registerIrCard("ST23-03", compiled);
