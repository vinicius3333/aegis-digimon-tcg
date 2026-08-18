// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q5800: "they play 1 [Petrification] Token" — the effect controller plays the token
// as an opponent's Digimon. controller on PlayToken is "mine" (activating player),
// placedAs:"opponentDigimon" describes placement side.
// Cost.to:"deckBottom" added on both return costs — "to the bottom of the deck" (runtime-effect review
// EX11-012 finding: absent `to` defaults to hand per Cost.to in ir.ts).
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Rush",
          "raw": "＜Rush＞"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Progress",
          "raw": "＜Progress＞"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "dp": {
                "op": "lte",
                "relativeToSource": true
              }
            },
            "count": 1
          },
          "optional": true
        },
        {
          "kind": "PlayToken",
          "token": "Petrification",
          "amount": 1,
          "controller": "mine",
          "placedAs": "opponentDigimon",
          "cost": {
            "kind": "return",
            "target": {
              "filter": {
                "zone": "trash",
                "controller": "opponent"
              },
              "count": 1
            },
            "to": "deckBottom",
            "raw": "by returning 1 card from your opponent's trash to the bottom of the deck"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "EndOfAttack",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "dp": {
                "op": "lte",
                "relativeToSource": true
              }
            },
            "count": 1
          },
          "optional": true
        },
        {
          "kind": "PlayToken",
          "token": "Petrification",
          "amount": 1,
          "controller": "mine",
          "placedAs": "opponentDigimon",
          "cost": {
            "kind": "return",
            "target": {
              "filter": {
                "zone": "trash",
                "controller": "opponent"
              },
              "count": 1
            },
            "to": "deckBottom",
            "raw": "by returning 1 card from your opponent's trash to the bottom of the deck"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "OnDeletion",
      "actions": [
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "zone": "security",
              "controller": "mine",
              "position": "top"
            },
            "count": 1
          }
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldLeavePlay",
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [
            {
              "kind": "Prevent",
              "mode": "leavePlay"
            }
          ],
          "cost": {
            "kind": "delete",
            "target": {
              "filter": {
                "isToken": true
              },
              "count": 1
            },
            "raw": "by deleting 1 Token, it doesn't leave"
          }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX11-012", compiled);
