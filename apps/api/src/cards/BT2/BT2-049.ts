// @ts-nocheck
// HAND-FIXED IR for BT2-049 (Puppetmon) — do not regenerate over this file.
// The generated [On Play] second clause ("During your opponent's next unsuspend
// phase, none of your opponent's Digimon can unsuspend") was miscompiled as an
// unconditional Unsuspend — which UNDID the suspend from the first clause. It is
// now an unsuspend-prevention Restrict on ALL opponent Digimon, scoped
// untilOpponentTurnEnd (the closest supported duration covering the opponent's
// next unsuspend phase; same shape as BT15-044 / BT15-012).
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Suspend",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          }
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": "all"
          },
          "restriction": "unsuspend",
          "duration": "untilOpponentTurnEnd",
          "raw": "During your opponent's next unsuspend phase, none of your opponent's Digimon can unsuspend."
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "GainMemory",
          "amount": 1
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT2-049", compiled);
