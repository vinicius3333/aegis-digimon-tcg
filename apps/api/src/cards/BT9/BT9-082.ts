// @ts-nocheck
// Hand-authored override — do not regenerate.
// [When Digivolving] gated on DNA digivolving:
//   Delete 1 opponent Lv6+ AND all opponent Lv5 or lower Digimon.
//   For each Digimon deleted by this effect, Recovery +1 (place top deck card on security).
// [On Deletion]: you may trash top card of security stack to play this card from trash without cost.
// KB Q1877: only this card re-enters; prior digivolution cards go to trash.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "condition": {
        "kind": "isDnaDigivolving"
      },
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "levelComparison": { "op": "gte", "value": 6 },
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          }
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "levelComparison": { "op": "lte", "value": 5 },
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": "all"
          }
        },
        {
          "kind": "SecurityManipulation",
          "op": "addTop",
          "controller": "mine",
          "source": "deck",
          "amount": 1,
          "scaling": {
            "per": 1,
            "unit": "deletedThisEffect"
          }
        }
      ]
    },
    {
      "trigger": "OnDeletion",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "isSelfRef": true,
              "zone": "trash"
            },
            "count": 1,
            "isSelf": true
          },
          "from": ["trash"],
          "payCost": false,
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "controller": "mine",
                "zone": "security",
                "position": "top"
              },
              "count": 1
            },
            "raw": "by trashing the top card of your security stack"
          },
          "optional": true
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "dnaDigivolveRequirement": [
    {
      "cost": 0,
      "materials": [
        {
          "color": "Purple",
          "level": 6
        },
        {
          "color": "Yellow",
          "level": 6
        }
      ]
    }
  ]
};

registerIrCard("BT9-082", compiled);
