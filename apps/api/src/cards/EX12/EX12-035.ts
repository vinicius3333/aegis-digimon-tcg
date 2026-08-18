// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for EX12-035.
// TrashDigivolution: changed count:1 + amount:4 to scope:"acrossDigimon" + amount:4 so the
// controller picks 4 cards from across ALL opponent Digimon's stacks (not just 1 Digimon).
// AllTurns SubTrigger "whenOneOfYoursDigivolves" is an approximation; text says "when any
// Digimon digivolves" (both players) — no whenAnyDigivolves engine event yet (residual #2).
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Evade",
          "raw": "＜Evade＞"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Decode",
          "raw": "＜Decode (Lv.5 or lower w/[Gabumon]/[Garurumon] in name or w/[ME]/[VB] trait)＞"
        }
      ]
    },
    {
      "trigger": "OnPlay",
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
            "count": "all"
          },
          "amount": 4,
          "scope": "acrossDigimon"
        },
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "digivolutionCardsCompareToSource": "lte"
            },
            "count": 1
          },
          "to": "deckBottom"
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
            "count": "all"
          },
          "amount": 4,
          "scope": "acrossDigimon"
        },
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "digivolutionCardsCompareToSource": "lte"
            },
            "count": 1
          },
          "to": "deckBottom"
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenPlayed",
          "sourceFilter": {
            "controllerDefault": "any",
            "kind": [
              "Digimon"
            ]
          },
          "actions": [
            {
              "kind": "Restrict",
              "target": {
                "filter": {
                  "controller": "opponent",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1
              },
              "restriction": "suspend",
              "duration": "untilOpponentTurnEnd"
            }
          ]
        },
        {
          "kind": "SubTrigger",
          "event": "whenOneOfYoursDigivolves",
          "sourceFilter": {
            "controllerDefault": "any",
            "kind": [
              "Digimon"
            ]
          },
          "actions": [
            {
              "kind": "Restrict",
              "target": {
                "filter": {
                  "controller": "opponent",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1
              },
              "restriction": "suspend",
              "duration": "untilOpponentTurnEnd"
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX12-035", compiled);
