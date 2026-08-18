// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [When Digivolving]:
// 1. 1 opponent Digimon gets <Security Attack -1> until end of opponent's turn.
// 2. If [Angewomon] or [X Antibody] (by name, KB Q1834) is in this Digimon's
//    digivolution cards AND you have 5 or fewer security cards: <Recovery +1 (Deck)>.
// Condition is allOf: selfDigivolutionStackHasTrait (nameExact) AND zoneCount<=5.
// Recovery uses GainKeyword action (not SecurityManipulation): the engine calls
// recoverToSecurity when a Recovery keyword is granted.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "keyword": {
            "keyword": "SecurityAttack",
            "amount": -1,
            "raw": "＜Security Attack -1＞"
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
            "keyword": "Recovery",
            "amount": 1,
            "raw": "＜Recovery +1 (Deck)＞"
          },
          "condition": {
            "kind": "allOf",
            "conditions": [
              {
                "kind": "selfDigivolutionStackHasTrait",
                "filter": {
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Angewomon",
                        "X Antibody"
                      ],
                      "match": "nameExact"
                    }
                  ]
                }
              },
              {
                "kind": "zoneCount",
                "seat": "mine",
                "zone": "security",
                "op": "lte",
                "value": 5,
                "raw": "you have 5 or fewer security cards"
              }
            ]
          }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Angewomon"
      ],
      "cost": 0,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT9-040", compiled);
