// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "GainMemory",
          "amount": 3,
          "condition": {
            "kind": "totalSecurityCount",
            "op": "lte",
            "value": 6,
            "raw": "there're 6 or fewer total cards in both players' security stacks"
          }
        },
        {
          "kind": "SecurityManipulation",
          "op": "placeAsSecurity",
          "controller": "mine",
          "source": {
            "filter": {
              "zone": "hand",
              "controller": "mine",
              "colors": [
                "Yellow"
              ]
            },
            "count": 1
          },
          "from": [
            "hand"
          ],
          "toTop": true,
          "condition": {
            "kind": "raw",
            "raw": "there're 6 or fewer total cards in both players' security stacks and revealed card is yellow"
          }
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "GainMemory",
          "amount": 3,
          "condition": {
            "kind": "totalSecurityCount",
            "op": "lte",
            "value": 6,
            "raw": "there're 6 or fewer total cards in both players' security stacks"
          }
        },
        {
          "kind": "SecurityManipulation",
          "op": "placeAsSecurity",
          "controller": "mine",
          "source": {
            "filter": {
              "zone": "hand",
              "controller": "mine",
              "colors": [
                "Yellow"
              ]
            },
            "count": 1
          },
          "from": [
            "hand"
          ],
          "toTop": true,
          "condition": {
            "kind": "raw",
            "raw": "there're 6 or fewer total cards in both players' security stacks and revealed card is yellow"
          }
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "zone": "security",
                "controller": "mine"
              },
              "count": 1
            },
            "raw": "By trashing the top card of your security stack"
          },
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": -7000,
          "duration": "forTheTurn"
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "partial",
  "residual": [
    "OnPlay/WhenDigivolving: card text reveals any hand card then places if yellow (returns to hand if not); IR pre-filters to yellow-only in source, so non-yellow cards cannot be selected — practical outcome is identical (non-yellow stays in hand either way) but skips the reveal step for non-yellow cards"
  ]
};

registerIrCard("BT13-046", compiled);
