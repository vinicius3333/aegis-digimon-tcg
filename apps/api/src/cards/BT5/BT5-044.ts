// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OpponentsTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenMovedFromBreeding",
          "sourceFilter": {
            "controller": "opponent",
            "kind": [
              "Digimon"
            ]
          },
          "actions": [
            {
              "kind": "GainKeyword",
              "target": {
                "filter": {
                  "controller": "opponent",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1,
                "sourceRef": "triggerSubject"
              },
              "keyword": {
                "keyword": "SecurityAttack",
                "amount": -3,
                "raw": "＜Security Attack -3＞"
              },
              "duration": "forTheTurn"
            }
          ]
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "ModifySecurityDP",
          "controller": "opponent",
          "amount": -3000,
          "duration": "permanent"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT5-044", compiled);
