// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Modal",
          "choose": 1,
          "condition": {
            "kind": "youHave",
            "filter": { "zone": "battleArea", "controllerDefault": "mine", "kind": ["Digimon"], "excludeSelf": true }
          },
          "options": [
            [
              {
                "kind": "GainMemory",
                "amount": 1
              }
            ],
            [
              {
                "kind": "ModifyDP",
                "target": {
                  "filter": {
                    "isSelfRef": true
                  },
                  "count": 1,
                  "isSelf": true
                },
                "amount": 2000,
                "duration": "forTheTurn"
              }
            ],
            [
              {
                "kind": "Delete",
                "target": {
                  "filter": {
                    "controller": "opponent",
                    "kind": [
                      "Digimon"
                    ],
                    "levels": [
                      3
                    ]
                  },
                  "count": 3,
                  "upTo": true
                }
              }
            ]
          ]
        },
        {
          "kind": "GainMemory",
          "amount": 1,
          "condition": { "kind": "youHaveNone", "filter": { "zone": "battleArea", "controllerDefault": "mine", "kind": ["Digimon"], "excludeSelf": true } }
        },
        {
          "kind": "ModifyDP",
          "target": { "filter": { "isSelfRef": true }, "count": 1, "isSelf": true },
          "amount": 2000,
          "duration": "forTheTurn",
          "condition": { "kind": "youHaveNone", "filter": { "zone": "battleArea", "controllerDefault": "mine", "kind": ["Digimon"], "excludeSelf": true } }
        },
        {
          "kind": "Delete",
          "target": { "filter": { "controller": "opponent", "kind": ["Digimon"], "levels": [3] }, "count": 3, "upTo": true },
          "condition": { "kind": "youHaveNone", "filter": { "zone": "battleArea", "controllerDefault": "mine", "kind": ["Digimon"], "excludeSelf": true } }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT5-082", compiled);
