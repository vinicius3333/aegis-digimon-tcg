// @ts-nocheck
// Hand-authored override for BT7-098.
// runtime-effect fix: the [Main] effect also lowers ALL opponent Security Digimon by -3000
// for the turn ("1 of your opponent's Digimon AND all of your opponent's Security
// Digimon get -3000 DP"). The declarative effect record dropped the Security half — added a
// ModifySecurityDP action.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": -3000,
          "duration": "forTheTurn"
        },
        {
          "kind": "ModifySecurityDP",
          "controller": "opponent",
          "amount": -3000,
          "duration": "forTheTurn"
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

registerIrCard("BT7-098", compiled);
