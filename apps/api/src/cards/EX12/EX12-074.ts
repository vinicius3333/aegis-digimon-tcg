// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for EX12-074 (Genshi Continent & Ashino Island).
// [Security][Your Turn][Once Per Turn]: the printed text is ONE compound-timed effect
//   (active while this card sits in the security stack, only during the controller's
//   turn), not two independent trigger channels. The prior split into a "Security"-
//   trigger effect and a "YourTurn"-trigger effect double-fired: staticModifier's
//   on-field base guard never holds for a plain Option (it never sits on the battle
//   area), so the "YourTurn" copy was actually dead, while the "Security" copy fired on
//   EITHER player's turn (turnOwnerGuard has no case for trigger "Security"). Folded
//   into a single effect matching the sibling P-181 pattern: trigger "YourTurn" (so
//   turnOwnerGuard ANDs in the your-turn gate) + isSecurity:true (routes timing/builder
//   through the security window regardless of trigger name — see timingForTrigger /
//   builderForTrigger in interpreter.ts). Digivolve target corrected: the card
//   digivolves itself (isSelf) into a [Shambala] trait Digimon from the hand, with cost
//   reduced by 1.
// [Main] play action: the separate Replacement action was wrong; fold the cost
//   reduction into the PlayWithoutCost directly via reduceCostBy:3 + payCost:true.
//   Remove the standalone Replacement action.
// [Security] PlayWithoutCost: added playCost ≤ 5 restriction (text: "play cost 5
//   or lower").
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "WaiveColorRequirement",
          "target": { "filter": { "isSelfRef": true }, "count": 1, "isSelf": true },
          "condition": {
            "kind": "youHave",
            "filter": { "controllerDefault": "mine", "nameOrTrait": [{ "tokens": ["Shambala"], "match": "trait" }] },
            "raw": "you have a card w/[Shambala] trait"
          }
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "isSecurity": true,
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenAttacking",
          "sourceFilter": {
            "controller": "mine",
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Shambala"
                ],
                "match": "trait"
              }
            ]
          },
          "actions": [
            {
              "kind": "Digivolve",
              "target": {
                "filter": {
                  "isSelfRef": true
                },
                "count": 1,
                "isSelf": true
              },
              "into": {
                "controllerDefault": "mine",
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Shambala"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "from": [
                "hand"
              ],
              "payCost": true,
              "reduceCost": 1,
              "optional": true
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "toHand",
          "controller": "mine",
          "amount": 1,
          "toTop": false
        },
        {
          "kind": "SecurityManipulation",
          "op": "placeAsSecurity",
          "controller": "mine",
          "source": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "toTop": false,
          "faceUp": true
        },
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Shambala"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "hand"
          ],
          "payCost": true,
          "reduceCostBy": 3,
          "optional": true
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Shambala"
                  ],
                  "match": "trait"
                }
              ],
              "playCostLte": 5
            },
            "count": 1
          },
          "from": [
            "hand",
            "trash"
          ],
          "payCost": false,
          "optional": true
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX12-074", compiled);

export { compiled };
