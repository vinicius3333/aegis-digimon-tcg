// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT23-102 Mastemon
// Text:
//   <Barrier>  <Partition ([Angewomon] & [LadyDevimon])>
//   [When Digivolving] You may play 1 level 5 or lower yellow or purple card from your
//   hand or trash without paying the cost. Then, if this Digimon's stack has 2 or more
//   same-level cards, trash the top cards of both players' security stacks so that they
//   have 3 cards left.
//   [All Turns] [Once Per Turn] When security stacks are removed from, you may place 1
//   Digimon as the bottom security card.
//
// KB Q5391: Either player's Digimon can be placed as the bottom security card.
// KB Q5392: The Partition trigger does NOT fire when this effect places self as security.
//
// Fixes:
//   1. WhenDigivolving second action: "trash the top cards of both players' security
//      stacks so that they have 3 cards left" — needs new capability
//      SecurityManipulation op:"trashTopUntilCount" (spec'd in LANE_E.md).
//      Encoded faithfully with the intended vocabulary; rendered as RawUnparsed until
//      the engine supports it.
//   2. AllTurns: wrap SecurityManipulation in SubTrigger whenSecurityRemoved.
//   3. AllTurns SecurityManipulation: controller "any" (KB Q5391 — either player).
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Barrier",
          "raw": "＜Barrier＞"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Partition",
          "raw": "＜Partition ([Angewomon] & [LadyDevimon])＞"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "colors": ["Yellow", "Purple"],
              "levelComparison": { "op": "lte", "value": 5 }
            },
            "count": 1
          },
          "from": ["hand", "trash"],
          "payCost": false,
          "optional": true
        },
        {
          "kind": "SecurityManipulation",
          "op": "trashTopUntilCount",
          "bothPlayers": true,
          "targetCount": 3,
          "condition": {
            "kind": "selfDigivolutionStackSameLevelCount",
            "minCount": 2,
            "raw": "this Digimon's stack has 2 or more same-level cards"
          }
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenSecurityRemoved",
          "actions": [
            {
              "kind": "SecurityManipulation",
              "op": "addBottom",
              "controller": "any",
              "amount": 1,
              "source": {
                "filter": {
                  "isDigimon": true
                },
                "count": 1,
                "upTo": false
              },
              "optional": true
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "partial",
  "residual": [
    "trashTopUntilCount: trash both players' security stacks until each has 3 cards (engine capability missing)"
  ]
};

registerIrCard("BT23-102", compiled);
