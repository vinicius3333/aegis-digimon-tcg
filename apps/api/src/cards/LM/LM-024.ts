// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q4026: at exactly 3 security BOTH the suspend+DP-buff AND the return fire.
// "3 or more" → suspend + DP buff; "3 or fewer" → return. At 3 both are true.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Counter",
      "actions": [],
      "isFromHand": true,
      "keywords": [
        { "keyword": "BlastDigivolve", "raw": "＜Blast Digivolve＞" }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Suspend",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"]
            },
            "count": 1
          },
          "condition": {
            "kind": "securityAtLeast",
            "value": 3
          }
        },
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": ["Digimon"]
            },
            "count": 1
          },
          "amount": 3000,
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "securityAtLeast",
            "value": 3
          }
        },
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "opponent",
              "suspended": true,
              "kind": ["Digimon"]
            },
            "count": 1
          },
          "to": "deckBottom",
          "condition": {
            "kind": "zoneCount",
            "seat": "mine",
            "zone": "security",
            "op": "lte",
            "value": 3,
            "raw": "you have 3 or fewer security cards"
          }
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
              "controller": "opponent",
              "kind": ["Digimon"]
            },
            "count": 1
          },
          "condition": {
            "kind": "securityAtLeast",
            "value": 3
          }
        },
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": ["Digimon"]
            },
            "count": 1
          },
          "amount": 3000,
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "securityAtLeast",
            "value": 3
          }
        },
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "opponent",
              "suspended": true,
              "kind": ["Digimon"]
            },
            "count": 1
          },
          "to": "deckBottom",
          "condition": {
            "kind": "zoneCount",
            "seat": "mine",
            "zone": "security",
            "op": "lte",
            "value": 3,
            "raw": "you have 3 or fewer security cards"
          }
        }
      ]
    },
    {
      // [All Turns] While this Digimon is suspended, it isn't affected by opponent Digimon effects.
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "GrantStatic",
          "target": {
            "filter": { "isSelfRef": true },
            "count": 1,
            "isSelf": true
          },
          "grant": "immuneToOpponentDigimonEffects",
          "duration": "whileCondition",
          "condition": {
            "kind": "isSelfSuspended",
            "raw": "while this Digimon is suspended"
          }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 5,
      "texts": ["Pulsemon"],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("LM-024", compiled);
