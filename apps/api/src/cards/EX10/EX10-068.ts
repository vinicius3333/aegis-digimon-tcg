// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored fix:
// (1) PlayWithoutCost: added from:["hand","trash"] — text says "from your hand or trash".
// (2) PlayWithoutCost: added optional:true — text says "you may play".
// (3) PlayWithoutCost cost.target: already has zone:trash + controller:opponent ✓;
//     added to:"deckBottom" — text says "to the bottom of the deck".
// (4) PlayWithoutCost target filter: added sameColorAsReturned:true — text says
//     "with the same color as the card this effect returned". This is a new engine
//     capability; see historical migration ledger CAP-LB-02.
// (5) Delete target already has playCostLte:5 ✓.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "StartOfYourMainPhase",
      "actions": [
        {
          "kind": "GainMemory",
          "amount": 1,
          "scaling": {
            "per": 2,
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon",
                "Tamer"
              ]
            },
            "unit": "colors"
          }
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "playCostLte": 5
            },
            "count": 1
          }
        },
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 4
              },
              "sameColorAsReturned": true
            },
            "count": 1
          },
          "from": [
            "hand",
            "trash"
          ],
          "payCost": false,
          "optional": true,
          "cost": {
            "kind": "return",
            "target": {
              "filter": {
                "zone": "trash",
                "controller": "opponent",
                "kind": [
                  "Digimon"
                ]
              },
              "count": 1
            },
            "to": "deckBottom",
            "raw": "by returning 1 Digimon card from your opponent's trash to the bottom of the deck"
          },
          "abortOnDecline": true
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
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "payCost": false
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX10-068", compiled);
