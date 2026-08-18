// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// All auditor findings were self-corrected as false positives:
// - digivolutionRequirement two-entry OR split (texts/trait) is correct.
// - optional:true on Attack matches "may attack" text.
// - PlaceUnder filter correctly encodes Gammamon-in-text OR VB-trait.
// Fixed: stray "}" in inherited Decode raw text (cosmetic typo in auto-generated output).
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Decode",
          "raw": "＜Decode (Lv.4 or lower w/[Gammamon] in text or w/[VB] trait)＞"
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "PlaceUnder",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 5
              },
              "nameOrTrait": [
                {
                  "tokens": [
                    "Gammamon"
                  ],
                  "match": "text"
                },
                {
                  "tokens": [
                    "VB"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1,
            "from": [
              "hand",
              "trash"
            ]
          },
          "optional": true,
          "abortOnDecline": true,
          "position": "bottom"
        },
        {
          "kind": "Attack",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "withoutSuspending": false,
          "optional": true
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "PlaceUnder",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 5
              },
              "nameOrTrait": [
                {
                  "tokens": [
                    "Gammamon"
                  ],
                  "match": "text"
                },
                {
                  "tokens": [
                    "VB"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1,
            "from": [
              "hand",
              "trash"
            ]
          },
          "optional": true,
          "abortOnDecline": true,
          "position": "bottom"
        },
        {
          "kind": "Attack",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "withoutSuspending": false,
          "optional": true
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "isInherited": true,
      "keywords": [
        {
          "keyword": "Decode",
          "raw": "＜Decode (Lv.4 or lower w/[Gammamon] in text or w/[VB] trait)＞"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 4,
      "texts": [
        "Gammamon"
      ],
      "cost": 3,
      "isAlternate": true
    },
    {
      "traits": [
        "VB"
      ],
      "cost": 3,
      "isAlternate": true,
      "level": 4
    }
  ]
};
registerIrCard("EX12-014", compiled);
