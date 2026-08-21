// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "payCost": false
        }
      ]
    },
    {
      "trigger": "OnPlay",
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
            "count": 2
          },
          "keyword": {
            "keyword": "SecurityAttack",
            "amount": -1,
            "raw": "＜Security Attack -1＞"
          },
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
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
            "count": 2
          },
          "keyword": {
            "keyword": "SecurityAttack",
            "amount": -1,
            "raw": "＜Security Attack -1＞"
          },
          "duration": "untilOpponentTurnEnd"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

export { compiled };

registerIrCard("EX10-014", compiled);
