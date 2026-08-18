import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Compiled effect IR for EX6-009 (Duramon; Red Lv.5 Digimon).
//
// The AUTO-GENERATED header was removed (card-module contract) to preserve this hand-edit
// across regeneration. Only the [Hand][Main] clause is changed: the runtime record emitted the
// "pay 2 cost and place this card as the bottom digivolution card of 1 of your Digimon
// that's level 5 or has the [Legend-Arms] trait" activation as a raw cost string with no
// level/trait restriction on the buff target (same shape as EX6-007's fix). It is now
// structured:
//   - cost: payMemory(2) — "By paying 2 cost".
//   - additionalCosts: a "place" cost that moves THIS card (isSelfRef, from hand) under a
//     chosen destination Digimon matching level 5 OR the [Legend-Arms] trait (underFilter +
//     underOrFilters), binding the chosen host as "placementTarget" (bindHostAs).
//   - target: fromSelectionRef "placementTarget" — the GainKeyword applies to the SAME
//     Digimon the card was just placed under, not an independently chosen/unrestricted one.
// All other clauses are the unchanged declarative effect record.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "GainKeyword",
          "target": {
            "fromSelectionRef": "placementTarget",
            "filter": {},
            "count": 1
          },
          "keyword": {
            "keyword": "SecurityAttack",
            "amount": 1,
            "raw": "＜Security Attack +1＞"
          },
          "duration": "forTheTurn",
          "cost": {
            "kind": "payMemory",
            "memory": 2,
            "raw": "By paying 2 cost"
          },
          "additionalCosts": [
            {
              "kind": "place",
              "target": {
                "filter": { "isSelfRef": true },
                "count": 1,
                "from": ["hand"]
              },
              "underFilter": {
                "controller": "mine",
                "kind": ["Digimon"],
                "levelComparison": { "op": "eq", "value": 5 }
              },
              "underOrFilters": [
                {
                  "controller": "mine",
                  "kind": ["Digimon"],
                  "nameOrTrait": [
                    { "tokens": ["Legend-Arms"], "match": "trait" }
                  ]
                }
              ],
              "destination": "digivolutionStack",
              "position": "bottom",
              "host": "target",
              "bindHostAs": "placementTarget",
              "raw": "and placing this card as the bottom digivolution card of 1 of your Digimon that's level 5 or has the [Legend-Arms] trait"
            }
          ],
          "raw": "By paying 2 cost and placing this card as the bottom digivolution card of 1 of your Digimon that's level 5 or has the [Legend-Arms] trait, that Digimon gains ＜Security Attack +1＞ for the turn.",
          "optional": true,
          "abortOnDecline": true
        }
      ],
      "isFromHand": true
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "onAddDigivolutionCards",
          "actions": [
            {
              "kind": "GainKeyword",
              "target": {
                "filter": {
                  "isSelfRef": true
                },
                "count": 1,
                "isSelf": true
              },
              "keyword": {
                "keyword": "Raid",
                "raw": "＜Raid＞"
              },
              "duration": "forTheTurn"
            },
            {
              "kind": "GainKeyword",
              "target": {
                "filter": {
                  "isSelfRef": true
                },
                "count": 1,
                "isSelf": true
              },
              "keyword": {
                "keyword": "Piercing",
                "raw": "＜Piercing＞"
              },
              "duration": "forTheTurn"
            }
          ],
          "raw": "onAddDigivolutionCards"
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenAttackTargetSwitched",
          "actions": [
            {
              "kind": "SecurityManipulation",
              "op": "trashTop",
              "controller": "opponent",
              "amount": 1
            }
          ],
          "raw": "whenAttackTargetSwitched"
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 4,
      "traits": [
        "Legend-Arms"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("EX6-009", compiled);
