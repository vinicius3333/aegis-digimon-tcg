// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// P-135 ShoeShoemon
// [When Digivolving] Until the end of your opponent's turn, 1 of their Digimon can't
//   attack Digimon and gains <Security Attack -1>.
// [Your Turn] While you have [Arisa Kinosaki], this Digimon gains <Jamming>.
// [When Attacking] (inherited) [Once Per Turn] 1 of your opponent's Digimon gets -2000 DP
//   for the turn.
//
// ENGINE GAP: "can't attack Digimon" (can still attack players) requires restriction
// "cantAttackDigimon" which is not yet in the Restriction enum. Both Restrict and GainKeyword
// target the same 1 opponent Digimon via SelectBind. See LANE_H.md: cantAttackDigimon.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "SelectBind",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1,
            "bindAs": "A"
          }
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {},
            "count": 1,
            "fromSelectionRef": "A"
          },
          "restriction": "cantAttackDigimon",
          "duration": "untilOpponentTurnEnd"
        },
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {},
            "count": 1,
            "fromSelectionRef": "A"
          },
          "keyword": {
            "keyword": "SecurityAttack",
            "amount": -1,
            "raw": "＜Security Attack -1＞"
          },
          "duration": "untilOpponentTurnEnd"
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
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "effect": {
            "kind": "keyword",
            "keyword": {
              "keyword": "Jamming",
              "raw": "＜Jamming＞"
            }
          },
          "while": {
            "kind": "youHave",
            "filter": {
              "controllerDefault": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Arisa Kinosaki"
                  ],
                  "match": "name"
                }
              ]
            },
            "raw": "you have [Arisa Kinosaki]"
          }
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": -2000,
          "duration": "forTheTurn"
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "partial",
  "residual": [
    "cantAttackDigimon: restriction 'cantAttackDigimon' not yet in Restriction enum — engine needs to allow attacking players while blocking Digimon attacks; see LANE_H.md"
  ]
};

registerIrCard("P-135", compiled);
