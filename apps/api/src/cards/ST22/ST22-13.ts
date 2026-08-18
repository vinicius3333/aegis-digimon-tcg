// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// ST22-13 GrandGalemon
// <Fortitude>
// <Vortex>
// [On Play][When Digivolving][When Attacking] You may suspend 1 Digimon. Then, this Digimon
//   gains +3000 DP for the turn.
// (inherited)[When Attacking][Once Per Turn] If your opponent has no unsuspended Digimon,
//   unsuspend this Digimon.
//
// KB Q5445: either player's Digimon may be suspended.
// Fix: Suspend is optional (player may decline), but if declined the DP gain is also skipped
// (the "then" is contingent on the "you may"). Suspend gets abortOnDecline:true; ModifyDP
// is not independently optional.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Fortitude",
          "raw": "＜Fortitude＞"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Vortex",
          "raw": "＜Vortex＞"
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
              "controllerDefault": "any",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "amount": 3000,
          "duration": "forTheTurn"
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
              "controllerDefault": "any",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "amount": 3000,
          "duration": "forTheTurn"
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Suspend",
          "target": {
            "filter": {
              "controllerDefault": "any",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "amount": 3000,
          "duration": "forTheTurn"
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "isSelfRef": true,
              "nameOrTrait": [
                {
                  "tokens": [
                    "Vortex Warriors"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1,
            "isSelf": true
          },
          "optional": true,
          "condition": {
            "kind": "opponentHasNone",
            "filter": {
              "controllerDefault": "opponent",
              "unsuspended": true,
              "kind": [
                "Digimon"
              ]
            },
            "raw": "your opponent has no unsuspended Digimon"
          }
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("ST22-13", compiled);
