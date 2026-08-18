// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [When Digivolving]: "Trash any 2 digivolution cards of your opponent's Digimon" means
// 2 total divo cards spread across any opponent Digimon (not 2 from a single target).
// Encoded via totalDigivolutionBudget:2 — a new engine capability (see LANE_E.md).
// fromTop is omitted (false by default) per card text — not top-specific.
// Inherited [Your Turn]: target filter includes [Ice-Snow] trait per text
// "this Digimon with the [Ice-Snow] trait gains".
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "IceClad",
          "raw": "＜Ice Clad＞"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "TrashDigivolution",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "digivolutionCards": "hasAny"
            },
            "count": "all",
            "totalDigivolutionBudget": 2
          },
          "amount": "budget",
          "fromTop": false
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
            "kind": "opponentHasNone",
            "filter": {
              "digivolutionCards": "hasAny",
              "controllerDefault": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "raw": "your opponent has no Digimon with digivolution cards"
          }
        }
      ]
    },
    {
      "trigger": "Rule",
      "actions": [
        {
          "kind": "GrantStatic",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "grant": "trait",
          "tokens": [
            "Ice-Snow"
          ]
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "Aura",
          "target": {
            "filter": {
              "isSelfRef": true,
              "nameOrTrait": [
                {
                  "tokens": [
                    "Ice-Snow"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1,
            "isSelf": true
          },
          "effect": {
            "kind": "keyword",
            "keyword": {
              "keyword": "Piercing",
              "raw": "＜Piercing＞"
            }
          },
          "while": {
            "kind": "opponentHasNone",
            "filter": {
              "digivolutionCards": "hasAny",
              "controllerDefault": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "raw": "your opponent has no Digimon with digivolution cards"
          }
        },
        {
          "kind": "Aura",
          "target": {
            "filter": {
              "isSelfRef": true,
              "nameOrTrait": [
                {
                  "tokens": [
                    "Ice-Snow"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1,
            "isSelf": true
          },
          "effect": {
            "kind": "keyword",
            "keyword": {
              "keyword": "SecurityAttack",
              "amount": 1,
              "raw": "＜Security Attack +1＞"
            }
          },
          "while": {
            "kind": "opponentHasNone",
            "filter": {
              "digivolutionCards": "hasAny",
              "controllerDefault": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "raw": "your opponent has no Digimon with digivolution cards"
          }
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "partial",
  "residual": [
    "TrashDigivolution.totalDigivolutionBudget:2 (spread across multiple Digimon) not yet executed by interpreter (see LANE_E.md)"
  ]
};

registerIrCard("EX7-021", compiled);
