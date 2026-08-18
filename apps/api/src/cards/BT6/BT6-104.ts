// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Fixed: was GrantAuraToOpponents targeting opponent Digimon. The card text says
// "1 of YOUR Digimon gains '[On Deletion] Gain 2 memory' until the end of your
// opponent's next turn." Uses GrantStatic grant:"effects" + token "OnDeletionGain2Memory"
// anchored on the controller's Digimon with duration untilOpponentTurnEnd (matching
// the RB1-030 pattern for duration-scoped [On Deletion] effect grants).
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "GrantStatic",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "grant": "effects",
          "tokens": [
            "OnDeletionGain2Memory"
          ],
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "AddToHandSelf"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT6-104", compiled);
