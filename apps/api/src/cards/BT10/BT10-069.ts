// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Compiled effect IR for BT10-069.
// The Return target's nameOrTrait ref carries `negate: true`: the printed text is
// "non-[DarkKnightmon (X Antibody)] Digimon card" (packages/shared cards.json), so
// the filter must exclude that name, not match only it.
// Fix vs auto-generated: "delete 1 Tamer, and unsuspend this Digimon" is a single
// "if [DarkKnightmon]/[X Antibody] is in this Digimon's digivolution cards" clause
// covering BOTH verbs (KB Q1991/Q1992) — the deletion is mandatory whenever a Tamer
// exists on EITHER side (no `controllerDefault`, so seatsForController spans both
// seats) and is restricted to kind ["Tamer"] only (no Digimon fallback), and the
// Unsuspend fires under the same condition regardless of whether a Tamer was deleted.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Return",
          "target": {
            "filter": {
              "zone": "trash",
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Black",
                "Purple"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "DarkKnightmon (X Antibody)"
                  ],
                  "match": "nameExact",
                  "negate": true
                }
              ]
            },
            "count": 1
          },
          "to": "hand"
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "kind": [
                "Tamer"
              ]
            },
            "count": 1
          },
          "condition": {
            "kind": "selfDigivolutionStackHasTrait",
            "filter": {
              "nameOrTrait": [
                {
                  "tokens": [
                    "DarkKnightmon",
                    "X Antibody"
                  ],
                  "match": "nameExact"
                }
              ]
            },
            "raw": "[DarkKnightmon] or [X Antibody] is in this Digimon's digivolution cards"
          }
        },
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "condition": {
            "kind": "selfDigivolutionStackHasTrait",
            "filter": {
              "nameOrTrait": [
                {
                  "tokens": [
                    "DarkKnightmon",
                    "X Antibody"
                  ],
                  "match": "nameExact"
                }
              ]
            },
            "raw": "[DarkKnightmon] or [X Antibody] is in this Digimon's digivolution cards"
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
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "DarkKnightmon"
                  ],
                  "match": "nameExact"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "trash"
          ],
          "payCost": false,
          "optional": true
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "DarkKnightmon"
      ],
      "cost": 4,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT10-069", compiled);
