// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for EX4-046 (WereGarurumon).
// Text:
//   [When Digivolving] 1 of your other Digimon may digivolve into a level 6 or lower
//     Digimon card with [Greymon] in its name from your hand for the cost reduced by 2.
//   Inherited [When an opponent's Digimon attacks] You may suspend this Digimon to
//     force the opponent to attack it instead (<Blocker>-style redirect).
//
// Fixes:
// 1. Digivolve action must restrict source zone to 'hand' (from:['hand']).
// 2. The cost reduction by 2 must only apply to the Digimon digivolving through THIS effect
//    (not all mine Digimon). The Replacement's sourceFilter must match only the Digimon
//    chosen by this Digivolve action.
// 3. Inherited effect was an empty Static — replace with WhenOpponentAttacks trigger.
//    The text is: "When an opponent's Digimon attacks, you may suspend this Digimon to
//    force the opponent's attack to target this Digimon instead" — this is the Blocker
//    keyword semantics but as a cost-based redirect. Encoded as a keyword grant.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Digivolve",
          "target": {
            "filter": {
              "controller": "mine",
              "excludeSelf": true,
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "into": {
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 6
              },
              "nameOrTrait": [
                {
                  "tokens": [
                    "Greymon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "hand"
          ],
          "payCost": true,
          "reduceCost": 2,
          "optional": true
        }
      ]
    },
    {
      "trigger": "WhenOpponentAttacks",
      "actions": [
        {
          "kind": "Suspend",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "optional": true,
          "cost": {
            "kind": "suspend",
            "target": { "filter": { "isSelfRef": true }, "count": 1, "isSelf": true },
            "raw": "suspend this Digimon"
          }
        },
        {
          "kind": "RedirectAttack",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "condition": {
            "kind": "ifThisEffectUsed",
            "raw": "if this Digimon was suspended by this effect"
          }
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX4-046", compiled);
