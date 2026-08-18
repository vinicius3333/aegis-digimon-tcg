// @ts-nocheck
// HAND-FIXED — KB Q3928: the [On Play]/[When Digivolving] suspend may target EITHER player's
// Digimon (controllerDefault "any", no possessive in the printed text), and the "if this Digimon
// is suspended" gate is the structured selfIsSuspended condition. Also encodes the
// "isn't returned to hand or deck by an opponent's effect, and isn't affected by
// <De-Digivolve> effects until the end of your opponent's turn" protection as two
// Restrict actions (beReturned + cantBeDeDigivolved, untilOpponentTurnEnd), gated by
// the same selfIsSuspended condition as the <De-Digivolve1> in the same sentence
// (precedent: BT21-074). Do not regenerate over this file.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
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
          "optional": true
        },
        {
          "kind": "DeDigivolve",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": 1,
          "condition": {
            "kind": "selfIsSuspended",
            "raw": "this Digimon is suspended"
          }
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "restriction": "beReturned",
          "byOpponentEffectsOnly": true,
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "selfIsSuspended",
            "raw": "this Digimon is suspended"
          }
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "restriction": "cantBeDeDigivolved",
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "selfIsSuspended",
            "raw": "this Digimon is suspended"
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
              "controllerDefault": "any",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "optional": true
        },
        {
          "kind": "DeDigivolve",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": 1,
          "condition": {
            "kind": "selfIsSuspended",
            "raw": "this Digimon is suspended"
          }
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "restriction": "beReturned",
          "byOpponentEffectsOnly": true,
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "selfIsSuspended",
            "raw": "this Digimon is suspended"
          }
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "restriction": "cantBeDeDigivolved",
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "selfIsSuspended",
            "raw": "this Digimon is suspended"
          }
        }
      ]
    },
    {
      "trigger": "Rule",
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
          "grant": "trait",
          "tokens": [
            "Dinosaur"
          ]
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
              "kind": "Trash",
              "target": {
                "filter": {
                  "controllerDefault": "mine"
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
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 4,
      "traits": [
        "Dinosaur"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("EX8-043", compiled);
