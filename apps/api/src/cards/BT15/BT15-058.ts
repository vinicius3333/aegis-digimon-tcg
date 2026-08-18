// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override (runtime-effect fix). "Suspend 1 of your opponent's Digimon. If [a
// DigiPolice Tamer is in this Digimon's digivolution cards], THAT Digimon can't unsuspend
// until the end of their turn." — bind the suspended Digimon and restrict that same one
// (the prior IR independently re-targeted an opponent Digimon for the Restrict).
const suspendThenRestrict = () => [
  {
    "kind": "SelectBind",
    "target": {
      "filter": {
        "controller": "opponent",
        "kind": ["Digimon"]
      },
      "count": 1,
      "bindAs": "suspended"
    }
  },
  {
    "kind": "Suspend",
    "target": {
      "fromSelectionRef": "suspended",
      "filter": {},
      "count": 1
    }
  },
  {
    "kind": "Restrict",
    "target": {
      "fromSelectionRef": "suspended",
      "filter": {},
      "count": 1
    },
    "restriction": "unsuspend",
    "duration": "untilOpponentTurnEnd",
    "condition": {
      "kind": "selfDigivolutionStackHasTrait",
      "filter": {
        "nameOrTrait": [
          {
            "tokens": ["DigiPolice"],
            "match": "trait"
          }
        ]
      },
      "raw": "a Tamer card with the [DigiPolice] trait is in this Digimon's digivolution cards"
    }
  }
];
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": []
    },
    {
      "trigger": "OnPlay",
      "actions": suspendThenRestrict()
    },
    {
      "trigger": "WhenDigivolving",
      "actions": suspendThenRestrict()
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenSuspended",
          "actions": [
            {
              "kind": "Suspend",
              "target": {
                "filter": {
                  "controller": "opponent",
                  "kind": [
                    "Digimon",
                    "Tamer"
                  ]
                },
                "count": 1
              }
            }
          ]
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT15-058", compiled);
