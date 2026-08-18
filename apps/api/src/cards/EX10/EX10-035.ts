import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-corrected IR override for EX10-035 (08-15). The [Hand][Main] reduced-cost play is the
// exclude filter, it plays THIS card from hand with the play cost reduced by 5 and arms the
// turn-end self-delete ON THE PLAYED PERMANENT. The DelayedDeletePlayed therefore fires ONLY on
// this reduced-cost play path (KB Q5737), NOT on a normal [On Play] — so it is modeled inside the
// activated effect, not under OnPlay. RestrictDigivolveInto ([Apocalymon]) is authored + A3-proven
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
      // The printed clause is [Hand][Main]: it activates only while this card is in hand.
      // effects.json carries the flag; this hand-authored override REPLACES that entry, so
      // dropping it here silently widened the clause to any zone (and, once the residency
      // guard landed, made the card's own play unreachable — a [Main] effect that is not
      // hand-flagged is excluded FROM the hand).
      "isFromHand": true,
      "condition": {
        "kind": "youHaveNone",
        "filter": {
          "kind": [
            "Digimon"
          ],
          "excludeNameOrTrait": [
            {
              "tokens": [
                "Dark Masters"
              ],
              "match": "any"
            }
          ]
        },
        "raw": "you don't have any Digimon other than Digimon with [Dark Masters] in their texts"
      },
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "from": [
            "hand"
          ],
          "payCost": true,
          "reduceCostBy": 5,
          "raw": "play this card with the play cost reduced by 5"
        },
        {
          "kind": "DelayedDeletePlayed",
          "raw": "at turn end, delete the Digimon this effect played"
        }
      ],
      "optional": true
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "DeDigivolve",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 2
          },
          "amount": 2
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "DeDigivolve",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 2
          },
          "amount": 2
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "RestrictDigivolveInto",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "into": {
            "nameOrTrait": [
              {
                "tokens": [
                  "Apocalymon"
                ],
                "match": "name"
              }
            ]
          },
          "duration": "permanent"
        }
      ]
    },
    {
      "trigger": "OnDeletion",
      "actions": [
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
          "condition": {
            "kind": "youHave",
            "filter": {
              "controllerDefault": "mine",
              "colors": [
                "Black"
              ]
            },
            "raw": "you have no black face-up security cards"
          }
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
              "levelComparison": {
                "op": "lte",
                "value": 5
              },
              "nameOrTrait": [
                {
                  "tokens": [
                    "Dark Masters"
                  ],
                  "match": "text"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "hand",
            "trash"
          ],
          "payCost": false,
          "condition": {
            "kind": "raw",
            "raw": "this card was face-up"
          },
          "optional": true
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": [],
};

registerIrCard("EX10-035", compiled);
