// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for BT16-048 (TyrantKabuterimon). "[When Digivolving] You may play 1
// Digimon card with the [Insectoid] or [Larva] trait from your hand with the play cost reduced
// by 8." The declarative effect record emitted `costReduction:{amount:8}` (an object) on the
// PlayWithoutCost action — but interpreter.ts's PlayWithoutCost handler only reads
// `action.reduceCostBy` (a plain number) to fold a reduction into the play verb's `costDelta`;
// `costReduction` is a different (also-numeric per ir.ts) field that kind never wires up, so the
// object value was silently ignored and the card played its target at full cost. Re-authored as
// `reduceCostBy:8`, the field the handler actually reads.
const compiled: CompiledCard = {
  "effects": [
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
              "nameOrTrait": [
                {
                  "tokens": [
                    "Insectoid",
                    "Larva"
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
          "optional": true,
          "reduceCostBy": 8
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "GrantStatic",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "grant": "immuneToOpponentDigimonEffects",
          "duration": "permanent",
          "condition": {
            "kind": "selfIsSuspended",
            "raw": "this Digimon is suspended"
          }
        }
      ]
    },
    {
      "trigger": "EndOfYourTurn",
      "actions": [
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "dpLessOrEqualToSuspendedDigimon": true
            },
            "count": 1
          },
          "to": "deckBottom",
          "cost": {
            "kind": "suspend",
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
            "raw": "By suspending 1 of your other Digimon"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 6,
      "traits": [
        "Insectoid"
      ],
      "cost": 2,
      "isAlternate": true,
      "playCostLte": 13
    }
  ]
};

registerIrCard("BT16-048", compiled);
