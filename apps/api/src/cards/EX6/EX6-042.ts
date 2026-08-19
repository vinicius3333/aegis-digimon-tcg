// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "GrantAuraToOpponents",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "effectText": "[Start of Your Main Phase] This Digimon attacks.",
          "duration": "untilOpponentTurnEnd",
          "cost": {
          "kind": "compound",
          "costs": [
            { "kind": "payMemory", "memory": 2 },
            { "kind": "place", "target": { "filter": { "zone": "hand", "controller": "mine", "kind": ["Option"] }, "count": 1, "from": ["hand"] }, "underFilter": { "controller": "mine", "kind": ["Digimon"], "levels": [5] }, "underOrFilters": [{ "controller": "mine", "kind": ["Digimon"], "nameOrTrait": [{ "tokens": ["Legend-Arms"], "match": "trait" }] }], "destination": "digivolutionStack", "position": "bottom", "host": "target" }
          ],
          "raw": "By paying 2 cost and placing this card as the bottom digivolution card of 1 of your Digimon that's level 5 or has the [Legend-Arms] trait"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ],
      "isFromHand": true
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "onAddDigivolutionCards",
          "actions": [
            {
              "kind": "GainKeyword",
              "target": {
                "filter": {
                  "isSelfRef": true
                },
                "count": 1,
                "isSelf": true
              },
              "keyword": {
                "keyword": "Blocker",
                "raw": "＜Blocker＞"
              },
              "duration": "untilOpponentTurnEnd"
            },
            {
              "kind": "GainKeyword",
              "target": {
                "filter": {
                  "isSelfRef": true
                },
                "count": 1,
                "isSelf": true
              },
              "keyword": {
                "keyword": "Reboot",
                "raw": "＜Reboot＞"
              },
              "duration": "untilOpponentTurnEnd"
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
          "kind": "Replacement",
          "event": "wouldBeDeleted",
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [
            {
              "kind": "Prevent",
              "cost": {
                "kind": "trash",
                "target": {
                  "filter": {
                    "controllerDefault": "mine",
                    "kind": [
                      "Digimon"
                    ],
                    "nameOrTrait": [
                      {
                        "tokens": [
                          "Legend-Arms"
                        ],
                        "match": "trait"
                      }
                    ]
                  },
                  "count": 1
                },
                "raw": "by trashing 1 card with the[Legend-Arms] trait from this Digimon's digivolution cards"
              },
              "optional": true,
              "abortOnDecline": true
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
      "level": 4,
      "traits": [
        "Legend-Arms"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("EX6-042", compiled);
