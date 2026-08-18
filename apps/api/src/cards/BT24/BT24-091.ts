// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for BT24-091 "Tidal Stream": the "If this effect returned" gate on
// the unsuspend leg was an inert raw condition (never fired). No effect-result
// binding exists for Return, so it is approximated as "your opponent has no Digimon"
// evaluated AFTER the return-all (exact whenever the return acted; diverges only
// when the opponent started with zero Digimon). The "lowest level" narrowing on the
// return-all has no IR superlative form either; both recorded in `residual`.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "WaiveColorRequirement",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "condition": {
            "kind": "youHave",
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Digimon",
                "Tamer"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "TS"
                  ],
                  "match": "trait"
                }
              ]
            },
            "raw": "you have an [TS] trait Digimon or Tamer on the field"
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
      ]
    },
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
              ]
            },
            "count": "all"
          },
          "to": "hand"
        },
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "TS"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "condition": {
            "kind": "opponentHasNone",
            "filter": {
              "kind": [
                "Digimon"
              ]
            },
            "raw": "this effect returned"
          }
        },
        {
          "kind": "Link",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "recipient": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "payCost": false,
          "optional": true
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [
    "\"If this effect returned\" approximated as opponent-has-no-Digimon after the return-all",
    "\"lowest level\" narrowing on the return-all not expressed (no level superlative in IR)"
  ]
};

registerIrCard("BT24-091", compiled);
