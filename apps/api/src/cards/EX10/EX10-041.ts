// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q5122 (binding): 1st effect does NOT trigger when this card is revealed from the deck/security
// and trashed — only when directly trashed by an effect. The deck clause keeps byEffect:true on its
// SubTrigger; the security clause is now EffectTiming.OnDiscardSecurity (fired only from an
// effect-driven trash-from-security seam — see GameEngine.fireDiscardedFromSecurity — so it is
// effect-only by construction and needs no separate byEffect gate).
// [On Play][When Digivolving]: cost = trash top security, effect = TrashTopDeck x2 + ModifyDP -3000
// all opponent Digimon for the turn (replaces the incorrect Trash-opponent-Digimon actions).
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenTrashedFromDeck",
          "sourceFilter": {
            "isSelfRef": true
          },
          "byEffect": true,
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
            }
          ]
        }
      ]
    },
    {
      "trigger": "OnDiscardSecurity",
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
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "trashTop",
          "controller": "mine",
          "amount": 1,
          "cost": true,
          "optional": true,
          "abortOnDecline": true,
          "raw": "By trashing your top security card"
        },
        {
          "kind": "TrashTopDeck",
          "controller": "mine",
          "amount": 2
        },
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": "all"
          },
          "amount": -3000,
          "duration": "forTheTurn"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "trashTop",
          "controller": "mine",
          "amount": 1,
          "cost": true,
          "optional": true,
          "abortOnDecline": true,
          "raw": "By trashing your top security card"
        },
        {
          "kind": "TrashTopDeck",
          "controller": "mine",
          "amount": 2
        },
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": "all"
          },
          "amount": -3000,
          "duration": "forTheTurn"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "isInherited": true,
      "keywords": [
        {
          "keyword": "Barrier",
          "raw": "＜Barrier＞"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 3,
      "traits": [
        "Evil"
      ],
      "cost": 2,
      "isAlternate": true
    }
  ]
};

registerIrCard("EX10-041", compiled);
