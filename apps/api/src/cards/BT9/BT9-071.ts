// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Errata (2024-01-19): "add 1 card with [Undead] or [Dark Animal] to hand,
// then trash 1 such card" — two separate add entries, ordered: hand first.
// KB Q1863: if only 1 eligible card, it goes to hand first; cannot trash it.
// KB Q1862: both hand-add and trash targets must have [Undead] or [Dark Animal].
// The two add entries execute in order (hand → trash) from the revealed 3.
// [Inherited][When Attacking]: may digivolve from trash (with cost, following requirements).
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "RevealAdd",
          "revealCount": 3,
          "add": [
            {
              "filter": {
                "controllerDefault": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Undead",
                      "Dark Animal"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "to": "hand"
            },
            {
              "filter": {
                "controllerDefault": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Undead",
                      "Dark Animal"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "to": "trash"
            }
          ],
          "rest": "deckBottom"
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Digivolve",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "into": {
            "filter": {
              "zone": "trash",
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Undead",
                    "Dark Animal"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "payCost": true,
          "optional": true
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT9-071", compiled);
