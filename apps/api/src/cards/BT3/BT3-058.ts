// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Piercing",
          "raw": "＜Piercing＞"
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "amount": 7000,
          "duration": "forTheTurn",
          "condition": {
            "kind": "attackTargetMatchesFilter",
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"],
              "dp": { "op": "gte", "value": 12000 }
            },
            "raw": "you attack an opponent's Digimon that has 12000 DP or more"
          }
        },
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "keyword": {
            "keyword": "SecurityAttack",
            "amount": 2,
            "raw": "＜Security Attack +2＞"
          },
          "duration": "forTheTurn",
          "condition": {
            "kind": "attackTargetMatchesFilter",
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"],
              "dp": { "op": "gte", "value": 12000 }
            },
            "raw": "you attack an opponent's Digimon that has 12000 DP or more"
          }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT3-058", compiled);
