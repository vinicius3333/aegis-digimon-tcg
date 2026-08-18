// @ts-nocheck
// HAND-FIXED IR for BT13-053 — do not regenerate. The printed "Then, until the end of
// your opponent's turn, 1 of your opponent's Digimon doesn't unsuspend" compiled as an
// immediate `Unsuspend` of an opponent Digimon, which UNDID the suspend; replaced with
// the unsuspend-prevention `Restrict` (untilOpponentTurnEnd).
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
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "dp": {
                "op": "lte",
                "value": 7000
              }
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
            "count": 1
          },
          "restriction": "unsuspend",
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldDigivolve",
          "sourceFilter": {
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ]
          },
          "actions": [
            {
              "kind": "Replacement",
              "event": "wouldDigivolve",
              "mode": "reduceCost",
              "amount": 1,
              "raw": "reduce the digivolution cost by 1"
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

registerIrCard("BT13-053", compiled);
