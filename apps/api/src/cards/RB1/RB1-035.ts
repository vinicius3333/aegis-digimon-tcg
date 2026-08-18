// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// RB1-035 Hokuto Amanokawa — hand-fixed IR.
// [Start of Your Turn] If your opponent has 3 or more Tamers, gain 1 memory.
// [All Turns] When an opponent plays a Digimon, by suspending this Tamer,
//   gain 1 memory if that Digimon is level 4 or higher,
//   and <Draw 1> if it is level 3.
//
// KB Q4109: can suspend for Lv.- Digimon (no level → neither condition fires).
// KB Q4110: if opponent plays Lv.3 AND Lv.4+ simultaneously, both conditions fire.
// KB Q4111: even if multiple Lv.3 are played at once, Draw 1 fires only once (once per trigger).
//
// Note: a `triggerSubjectHasLevel` condition type is not in the IR schema;
// the level-conditional actions are encoded with `raw` conditions (LANE_E.md).
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "StartOfYourTurn",
      "actions": [
        {
          "kind": "GainMemory",
          "amount": 1,
          "condition": {
            "kind": "opponentHas",
            "filter": {
              "controllerDefault": "opponent",
              "kind": ["Tamer"]
            },
            "count": 3,
            "raw": "your opponent has 3 or more Tamers"
          }
        }
      ]
    },
    {
      // [All Turns] When an opponent plays a Digimon, by suspending this Tamer,
      // gain 1 memory if that Digimon is level 4 or higher, and <Draw 1> if level 3.
      // Single suspend cost for both conditional actions (once per trigger event).
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenPlayed",
          "sourceFilter": {
            "controller": "opponent",
            "kind": ["Digimon"]
          },
          "actions": [
            {
              "kind": "GainMemory",
              "amount": 1,
              "condition": {
                "kind": "raw",
                "raw": "that Digimon is level 4 or higher"
              }
            },
            {
              "kind": "Draw",
              "amount": 1,
              "controller": "mine",
              "condition": {
                "kind": "raw",
                "raw": "that Digimon is level 3"
              }
            }
          ],
          "cost": {
            "kind": "suspend",
            "target": {
              "filter": { "isSelfRef": true },
              "count": 1,
              "isSelf": true
            },
            "raw": "by suspending this Tamer"
          }
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": { "isSelfRef": true },
            "count": 1,
            "isSelf": true
          },
          "payCost": false
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "partial",
  "residual": [
    "GainMemory/Draw level conditions on trigger subject encoded as raw; triggerSubjectHasLevel not in IR schema (LANE_E.md)"
  ]
};

registerIrCard("RB1-035", compiled);
