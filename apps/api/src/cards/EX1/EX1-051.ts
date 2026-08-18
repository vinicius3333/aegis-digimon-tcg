// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [Opponent's Turn][Once Per Turn] When an opponent's Digimon digivolves into a level 5 or higher
// Digimon (NOT in the breeding area per KB Q3236), gain 1 memory.
// [All Turns] inherited: all of your OTHER Digimon with the same name as the HOST Digimon
// (the top card of the stack that includes this card, per KB Q3237) get +2000 DP.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OpponentsTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenOneOfYoursDigivolves",
          "sourceFilter": {
            "controller": "opponent",
            "kind": ["Digimon"],
            "levelComparison": { "op": "gte", "value": 5 },
            "zone": "battleArea"
          },
          "actions": [
            {
              "kind": "GainMemory",
              "amount": 1
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "mine",
              "excludeSelf": true,
              "kind": ["Digimon"],
              "isSameName": true
            },
            "count": "all"
          },
          "amount": 2000,
          "duration": "permanent"
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX1-051", compiled);
