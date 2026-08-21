// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [Main]: Return 1 opponent's Digimon Lv.4 or lower to bottom of deck.
// By returning 1 of your blue Digimon to the bottom of the deck [as a cost],
// return a Digimon Lv.6 or lower INSTEAD (not in addition).
// Encoded as: try upgraded (cost+Lv.6); if declined, fall back to base (Lv.4).
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 6
              }
            },
            "count": 1
          },
          "to": "deckBottom",
          "bindResultAs": "upgraded",
          "cost": {
            "kind": "return",
            "target": {
              "filter": {
                "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Blue"
              ],
              "keywords": [
                "Decode"
              ]
              },
              "count": 1
            },
            "raw": "By returning 1 of your blue Digimon to the bottom of the deck"
          },
          "optional": true,
          "abortOnDecline": false
        },
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 4
              }
            },
            "count": 1
          },
          "to": "deckBottom",
          "condition": {
            "kind": "bindingEmpty",
            "ref": "upgraded",
            "raw": "the upgraded return was not used"
          }
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "ActivateMain"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT19-092", compiled);
