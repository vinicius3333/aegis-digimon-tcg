// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "TrashTopDeck",
          "controller": "mine",
          "amount": 4
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "onDiscardLibrary",
          "actions": [
            {
              "kind": "GainMemory",
              "amount": 1,
              "scaling": {
                "per": 10,
                "filter": {
                  "zone": "trash",
                  "controller": "mine"
                },
                "unit": "trash"
              }
            }
          ],
          "sourceFilter": {
            "controller": "mine"
          }
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "onDiscardLibrary",
          "actions": [
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
                "amount": 1,
                "raw": "＜Security Attack +1＞"
              },
              "duration": "forTheTurn"
            }
          ],
          "sourceFilter": {
            "controller": "mine"
          }
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("ST14-08", compiled);
