// @ts-nocheck
// HAND-FIXED IR for BT8-104 — do not regenerate.
// Main: removed spurious Trash action (the De-Digivolve parenthetical is part of that
// keyword, not a separate action). PlaceUnder: added from:["hand"], corrected underFilter
// to mine black X-Antibody Digimon (was opponent's), added position:bottom. Added Delete
// gated on PlaceUnder.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
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
              "kind": ["Digimon"]
            },
            "count": 1
          },
          "amount": 1
        },
        {
          "kind": "PlaceUnder",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": ["X-Antibody"],
                  "match": "trait"
                }
              ]
            },
            "from": ["hand"],
            "count": 1
          },
          "underFilter": {
            "controller": "mine",
            "colors": ["Black"],
            "kind": ["Digimon"],
            "nameOrTrait": [
              {
                "tokens": ["X-Antibody"],
                "match": "trait"
              }
            ]
          },
          "position": "bottom",
          "optional": true
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"],
              "playCostLte": 4
            },
            "count": 1
          },
          "condition": {
            "kind": "ifThisEffectActed",
            "raw": "PlaceUnder resolved"
          }
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "DeDigivolve",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"]
            },
            "count": 1
          },
          "amount": 1
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"],
              "playCostLte": 4
            },
            "count": 1
          }
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT8-104", compiled);
