// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored fix:
// (1) WhenDigivolving: removed digivolutionCards:hasAny filter — text says "trash 1
//     digivolution card from the bottom of 1 of your opponent's Digimon" with no
//     prerequisite on the target having digivolution cards. If the Digimon has none,
//     the effect simply can't trash one (no-op); the target itself is any opp Digimon.
// (2) YourTurn: replaced Vortex (which lets you attack any unsuspended Digimon) with
//     RestrictedVortex: can attack unsuspended opponent Digimon that have NO divi cards.
//     This is a new capability — see historical migration ledger CAP-LB-01.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "TrashDigivolution",
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
          "fromTop": false
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "GrantCanAttackUnsuspended",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "duration": "permanent",
          "noDigivolutionCards": true
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX1-018", compiled);
