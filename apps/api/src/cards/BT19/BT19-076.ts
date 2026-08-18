// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for BT19-076 (Luminamon).
// Fixes:
// 1. Replaced RawUnparsed "Reveal top 3 cards" + broken AddToHand/Return with a proper
//    RevealAdd action: reveal 3, add 1 with [Xros Heart]/[Blue Flare]/[Twilight] trait,
//    return remaining to deck bottom.
// 2. AddToHand filter now has the correct trait restriction
//    (any of: Xros Heart, Blue Flare, Twilight trait) not kind:['Card'].
// 3. Return action now targets "all" remaining revealed cards, not 1 opponent card.
// 4. No KB entries; text is authoritative.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "RevealAdd",
          "revealCount": 3,
          "add": [
            {
              "filter": {
                "controllerDefault": "mine",
                "nameOrTrait": [
                  {
                    "tokens": ["Xros Heart", "Blue Flare", "Twilight"],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "to": "hand"
            }
          ],
          "rest": "deckBottom"
        },
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": ["Tamer"],
              "playCostLte": 4
            },
            "count": 1
          },
          "from": ["hand"],
          "payCost": false,
          "optional": true
        }
      ]
    },
    {
      "trigger": "OnDeletion",
      "actions": [],
      "keywords": [
        {
          "keyword": "Save",
          "raw": "＜Save＞"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": ["Shademon"],
      "cost": 2,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT19-076", compiled);
