// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for BT20-044 (Breakdramon).
// Fixes from audit:
// 1. AllTurns and inherited AllTurns SubTrigger events add sourceFilter requiring the
//    deleting Digimon to have [Dracomon] or [Examon] in its text (textContains either).
//    KB Q4363/Q4365 confirm: "any of your Digimon with [Dracomon] in their texts or
//    any of your Digimon with [Examon] in their texts".
//    KB Q4366 clarifies "in its text" = name, traits, effects, inherited effects, etc.
// 2. Both effects add a fireCondition that the deleting Digimon must NOT itself be
//    deleted at the same time as the opponent's Digimon.
//    KB Q4364/Q4367 confirm: cannot activate if both are deleted at the same timing.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Blocker",
          "raw": "＜Blocker＞"
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Suspend",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon", "Tamer"]
            },
            "count": 2
          }
        },
        {
          "kind": "Attack",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": ["Digimon"]
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
          "kind": "Suspend",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon", "Tamer"]
            },
            "count": 2
          }
        },
        {
          "kind": "Attack",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": ["Digimon"]
            },
            "count": 1
          },
          "withoutSuspending": false,
          "optional": true
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenDeletesInBattle",
          "sourceFilter": {
            "controller": "mine",
            "kind": ["Digimon"],
            "textContains": ["[Dracomon]", "[Examon]"]
          },
          "fireCondition": {
            "kind": "triggerSourceNotDeletedAtSameTiming",
            "raw": "that Digimon is not deleted at the same timing"
          },
          "actions": [
            {
              "kind": "Delete",
              "target": {
                "filter": {
                  "controllerDefault": "opponent",
                  "suspended": true,
                  "kind": ["Digimon", "Tamer"]
                },
                "count": 1
              }
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenDeletesInBattle",
          "sourceFilter": {
            "controller": "mine",
            "kind": ["Digimon"],
            "textContains": ["[Dracomon]", "[Examon]"]
          },
          "fireCondition": {
            "kind": "triggerSourceNotDeletedAtSameTiming",
            "raw": "that Digimon is not deleted at the same timing"
          },
          "actions": [
            {
              "kind": "Delete",
              "target": {
                "filter": {
                  "controllerDefault": "opponent",
                  "suspended": true,
                  "kind": ["Digimon", "Tamer"]
                },
                "count": 1
              }
            }
          ]
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": ["Groundramon", "Wingdramon"],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT20-044", compiled);
