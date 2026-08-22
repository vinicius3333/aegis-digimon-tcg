// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldBePlayed",
          "sourceFilter": {
            "controllerDefault": "mine"
          },
          "actions": [
            {
              "kind": "Replacement",
              "event": "wouldBePlayed",
              "mode": "reduceCost",
              "amount": 1,
              "raw": "reduce the cost by 1",
              "cost": {
                "kind": "place",
                "target": {
                  "filter": {
                    "zone": "trash",
                    "controller": "mine",
                    "nameOrTrait": [
                      {
                        "tokens": [
                          "Unidentified"
                        ],
                        "match": "trait"
                      },
                      {
                        "tokens": [
                          "Diaboromon"
                        ],
                        "match": "text",
                        "orPrevious": true
                      }
                    ]
                  },
                  "count": 13,
                  "upTo": true,
                  "from": [
                    "trash"
                  ]
                },
                "raw": "by placing up to 13 cards with the [Unidentified] trait or [Diaboromon] in its text from your trash at the bottom of your deck"
              },
              "optional": true,
              "abortOnDecline": true
            }
          ],
          "scaling": {
            "per": 1,
            "filter": {
              "controllerDefault": "mine"
            },
            "unit": "cards"
          }
        }
      ]
    },
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
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Reboot",
          "raw": "＜Reboot＞"
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "DeleteBudget",
          "filter": {
            "controller": "opponent",
            "kind": [
              "Digimon"
            ]
          },
          "budget": 15,
          "upTo": true,
          "raw": "Delete any of your opponent's Digimon with total play costs up to 15."
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "DeleteBudget",
          "filter": {
            "controller": "opponent",
            "kind": [
              "Digimon"
            ]
          },
          "budget": 15,
          "upTo": true,
          "raw": "Delete any of your opponent's Digimon with total play costs up to 15."
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "GrantCanAttackUnsuspended",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "duration": "permanent",
          "raw": "This Digimon can attack your opponent's unsuspended Digimon."
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT17-060", compiled);
