// @ts-nocheck
// HAND-AUTHORED OVERRIDE: KB Q719 binds the freeze to the suspended target and DNA only.
// KB Q720 counts only the colors of the inherited effect's host top card.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
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
            "bindAs": "dinobeemonTarget"
          }
        },
        {
          "kind": "Suspend",
          "target": {
            "filter": {},
            "count": 1,
            "fromSelectionRef": "dinobeemonTarget"
          }
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {},
            "count": 1,
            "fromSelectionRef": "dinobeemonTarget"
          },
          "restriction": "unsuspend",
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "isDnaDigivolving",
            "raw": "When DNA digivolving"
          }
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
            "kind": "modifyDP",
            "amount": 1000
          },
          "while": {
            "kind": "selfColorCount",
            "op": "gte",
            "value": 1,
            "raw": "this Digimon has at least 1 color"
          }
        },
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
            "kind": "modifyDP",
            "amount": 1000
          },
          "while": {
            "kind": "selfColorCount",
            "op": "gte",
            "value": 2,
            "raw": "this Digimon has at least 2 colors"
          }
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": [],
  "dnaDigivolveRequirement": [
    {
      "cost": 0,
      "materials": [
        {
          "color": "Green",
          "level": 4
        },
        {
          "color": "Blue",
          "level": 4
        }
      ]
    }
  ]
};

registerIrCard("ST9-11", compiled);
