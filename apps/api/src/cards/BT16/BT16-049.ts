// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenPlayed",
          "sourceFilter": {
            "controller": "mine",
            "excludeSelf": true,
            "kind": [
              "Digimon"
            ]
          },
          "actions": [
            {
              "kind": "GainMemory",
              "amount": 1,
              "condition": {
                "kind": "anyOf",
                "conditions": [
                  { "kind": "triggerSubjectMatchesFilter", "filter": { "nameOrTrait": [{ "tokens": ["Free"], "match": "trait" }] } },
                  { "kind": "triggerSubjectHasColor", "filter": { "colors": ["Yellow"] } }
                ],
                "raw": "it has the [Free] trait or is yellow"
              }
            }
          ]
        },
        {
          "kind": "SubTrigger",
          "event": "whenOneOfYoursDigivolves",
          "sourceFilter": {
            "controller": "mine",
            "excludeSelf": true,
            "kind": [
              "Digimon"
            ]
          },
          "actions": [
            {
              "kind": "GainMemory",
              "amount": 1,
              "condition": {
                "kind": "anyOf",
                "conditions": [
                  { "kind": "triggerSubjectMatchesFilter", "filter": { "nameOrTrait": [{ "tokens": ["Free"], "match": "trait" }] } },
                  { "kind": "triggerSubjectHasColor", "filter": { "colors": ["Yellow"] } }
                ],
                "raw": "it has the [Free] trait or is yellow"
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
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "amount": 1000,
          "duration": "permanent"
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Upamon"
      ],
      "cost": 0,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT16-049", compiled);
