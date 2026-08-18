// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "amount": 2000,
          "duration": "permanent"
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "CostModifier",
          "mode": "raiseCeiling",
          "costType": "dpDeletion",
          "amount": 2000,
          "condition": {
            "kind": "youHave",
            "filter": {
              "zone": "battleArea",
              "controllerDefault": "mine",
              "kind": [
                "Tamer"
              ],
              "colors": [
                "Red"
              ]
            },
            "raw": "you have a red Tamer in play"
          }
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": "all",
            "totalDpCap": 6000
          }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX2-011", compiled);
