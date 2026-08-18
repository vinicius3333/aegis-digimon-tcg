// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [When Digivolving][On Deletion] (Draw 1 card from your deck). Then, trash 1 card in your hand.
// Inherited: (When this Digimon is deleted after losing a battle, delete the Digimon it was battling).
// The inherited effect is not encodable: no IR event for "deleted after losing a battle",
// and no filter for "the Digimon it was battling" (battle opponent reference).
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 1
        },
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "controller": "mine",
              "zone": "hand"
            },
            "count": 1
          }
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 1
        },
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "controller": "mine",
              "zone": "hand"
            },
            "count": 1
          }
        }
      ]
    },
    {
      "trigger": "OnDeletion",
      "actions": [
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 1
        },
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "controller": "mine",
              "zone": "hand"
            },
            "count": 1
          }
        }
      ]
    }
  ],
  "coverage": "partial",
  "residual": [
    "Inherited effect not encoded: 'when deleted after losing a battle, delete the Digimon it was battling' requires (1) an OnDeletion sub-trigger scoped to battle loss (no 'leaveCause:byBattle' exists in IR), and (2) a filter for the current battle opponent (not available in IR Filter)"
  ]
};
registerIrCard("BT15-073", compiled);
