// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for BT2-041 (ShineGreymon).
// Fix: [When Digivolving] suspends all yellow Tamers; for EACH Tamer suspended, activates
// -4000 DP on a separate chosen opponent Digimon. KB Q1014 confirms each Tamer suspended
// produces a separate activation with its own target choice.
// The old IR had a single Modal with scaling:1 — wrong (only one target choice total).
// Correct IR: Suspend all yellow Tamers, then ForEachSuspended action repeats ModifyDP
// once per Tamer suspended.
// NOTE: "ForEachSuspended" needs engine support — see LANE_E.md: repeatPerTriggerCount.
// The YourTurn +1000DP scaling per Tamer in play is correct and unchanged.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Suspend",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": ["Tamer"],
              "colors": ["Yellow"]
            },
            "count": "all"
          },
          "trackCount": "suspendedThisEffect"
        },
        {
          "kind": "RepeatPerCount",
          "countSource": "suspendedThisEffect",
          "action": {
            "kind": "ModifyDP",
            "target": {
              "filter": {
                "controller": "opponent",
                "kind": ["Digimon"]
              },
              "count": 1
            },
            "amount": -4000,
            "duration": "forTheTurn"
          },
          "raw": "For each Tamer you suspend this way, 1 of your opponent's Digimon gets -4000 DP for the turn"
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": { "isSelfRef": true },
            "count": 1,
            "isSelf": true
          },
          "amount": 1000,
          "duration": "permanent",
          "scaling": {
            "per": 1,
            "filter": {
              "zone": "battleArea",
              "controller": "mine",
              "kind": ["Tamer"]
            },
            "unit": "cards"
          }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT2-041", compiled);
