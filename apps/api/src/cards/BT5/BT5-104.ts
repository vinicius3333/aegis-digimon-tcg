// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q1377: can create Diaboromon token even if no valid DeDigivolve target exists.
// KB Q1378: can create token from existing Diaboromon token in battle area.
// The parenthetical "(you can't trash more cards if target has no digivolution cards
// or becomes lv3)" is a built-in constraint of DeDigivolve, not a separate action.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
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
            "count": 1
          },
          "amount": 2
        },
        {
          "kind": "PlayToken",
          "tokens": [
            "Diaboromon"
          ],
          "count": 1,
          "payCost": false,
          "condition": {
            "kind": "youHave",
            "filter": {
              "zone": "battleArea",
              "controllerDefault": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Diaboromon"
                  ],
                  "match": "name"
                }
              ]
            },
            "raw": "you have a [Diaboromon] in play"
          },
          "optional": true
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

registerIrCard("BT5-104", compiled);
