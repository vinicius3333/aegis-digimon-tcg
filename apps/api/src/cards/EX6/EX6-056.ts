// @ts-nocheck
// HAND-FIXED IR for EX6-056 — do not regenerate.
// OnPlay+WhenDigivolving DeDigivolve: removed levels:[3] (no target-level restriction in text).
// AllTurns Replacement: sourceFilter restricted to self (isSelfRef), otherThanBattle leaveCause,
// target zone:trash + from:[trash], underFilter zone:breedingArea — mirrors EX6-060's hand fix
// for the same "Seven Great Demon Lords"/"Gate of Deadly Sins" mechanic (KB Q3791).
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
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
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "TrashTopDeck",
          "controller": "mine",
          "amount": 4
        },
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
          "amount": 2,
          "stopAtLevel": 3,
          "condition": {
            "kind": "youHave",
            "filter": {
              "controller": "mine"
            },
            "count": 10,
            "raw": "you have 10 or more cards in your trash"
          }
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "TrashTopDeck",
          "controller": "mine",
          "amount": 4
        },
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
          "amount": 2,
          "stopAtLevel": 3,
          "condition": {
            "kind": "youHave",
            "filter": {
              "controller": "mine"
            },
            "count": 10,
            "raw": "you have 10 or more cards in your trash"
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
          "leaveCause": "otherThanBattle",
          "raw": "When this Digimon would leave the battle area other than in battle, place 1 [Seven Great Demon Lords] trait card from your trash under 1 of your [Gate of Deadly Sins] in the breeding area.",
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [
            {
              "kind": "PlaceUnder",
              "target": {
                "filter": {
                  "controller": "mine",
                  "zone": "trash",
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Seven Great Demon Lords"
                      ],
                      "match": "trait"
                    }
                  ]
                },
                "from": [
                  "trash"
                ],
                "count": 1
              },
              "underFilter": {
                "controller": "mine",
                "zone": "breeding",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Gate of Deadly Sins"
                    ],
                    "match": "name"
                  }
                ]
              }
            }
          ]
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX6-056", compiled);
