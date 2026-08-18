// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// P-140 MegaKabuterimon.
// digivolutionRequirement names:["Insectoid"] is substring match (any card with "Insectoid" in name).
// AllTurns immunity condition uses raw since no structured isSuspended condition kind exists.
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
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "GrantStatic",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "grant": "immuneToOpponentDigimonEffects",
          "duration": "permanent",
          "condition": {
            "kind": "selfIsSuspended",
            "raw": "this Digimon is suspended"
          }
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenDeletesInBattle",
          "actions": [
            {
              "kind": "SecurityManipulation",
              "op": "trashTop",
              "controller": "opponent",
              "amount": 1
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
      "names": [
        "Insectoid"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("P-140", compiled);
