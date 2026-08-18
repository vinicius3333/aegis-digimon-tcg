// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q4849: the [Device] Option card is placed into the battle area (not stacked under this
// Digimon); it can later be trashed by this card's second [When Digivolving]/[When Attacking] effect.
const compiled: CompiledCard = {
  "effects": [
    {
      // [When Digivolving] By placing 1 Option card with the [Device] trait from your hand
      // or trash into the battle area, this Digimon gets +3000 DP until your opponent's turn ends.
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": { "isSelfRef": true },
            "count": 1,
            "isSelf": true
          },
          "amount": 3000,
          "duration": "untilOpponentTurnEnd",
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "controller": "mine",
                "kind": ["Option"],
                "nameOrTrait": [
                  { "tokens": ["Device"], "match": "trait" }
                ]
              },
              "count": 1,
              "from": ["hand", "trash"]
            },
            "destination": "battleArea",
            "raw": "By placing 1 Option card with the [Device] trait from your hand or trash into the battle area"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      // [When Digivolving] [When Attacking] [Once Per Turn]
      // By trashing 1 of your Option cards in the battle area, delete 1 opponent Digimon
      // with play cost 9 or less.
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"],
              "playCostLte": 9
            },
            "count": 1
          },
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "zone": "battleArea",
                "controller": "mine",
                "kind": ["Option"]
              },
              "count": 1
            },
            "raw": "By trashing 1 of your Option cards in the battle area"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"],
              "playCostLte": 9
            },
            "count": 1
          },
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "zone": "battleArea",
                "controller": "mine",
                "kind": ["Option"]
              },
              "count": 1
            },
            "raw": "By trashing 1 of your Option cards in the battle area"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": ["Justimon: Blitz Arm", "Justimon: Accel Arm"],
      "cost": 1,
      "isAlternate": true
    }
  ]
};

registerIrCard("P-179", compiled);
