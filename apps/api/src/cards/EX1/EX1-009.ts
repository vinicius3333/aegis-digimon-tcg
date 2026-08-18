// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [],
      "keywords": [
        {
          "keyword": "Blitz",
          "raw": "＜Blitz＞"
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "keywords": [
                "Blocker"
              ]
            },
            "count": 1
          },
          "condition": {
            "kind": "youHave",
            "filter": {
              "zone": "battleArea",
              "controllerDefault": "mine",
              "kind": [
                "Tamer"
              ]
            },
            "raw": "you have a Tamer in play"
          },
          "attackPlayer": true
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX1-009", compiled);
