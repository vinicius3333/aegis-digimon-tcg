// @ts-nocheck
// HAND-FIXED IR for BT13-093 — do not regenerate.
// OnDeletion PlaceUnder: added optional:true (Q&A confirms "you don't have to place").
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Draw",
          "amount": 1,
          "controller": "mine"
        }
      ]
    },
    {
      "trigger": "OnDeletion",
      "actions": [
        {
          "kind": "PlaceUnder",
          "target": {
            "filter": {
              "controller": "mine",
              "zone": "hand",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Royal Knight"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "from": ["hand"],
          "underFilter": {
            "controller": "mine",
            "zone": "breedingArea",
            "nameOrTrait": [
              {
                "tokens": [
                  "King Drasil_7D6"
                ],
                "match": "name"
              }
            ]
          },
          "optional": true,
          "position": "bottom"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT13-093", compiled);
