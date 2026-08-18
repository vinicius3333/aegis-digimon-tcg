// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for EX12-037.
// "for every 5 of this Digimon's digivolution cards, activate 1 of the effects below":
// Modal.chooseScaling = { per:5, unit:"digivolutionCards" } drives the pick count.
// 0–4 cards → 0 options; 5–9 → 1; 10–14 → 2. The declarative effect record had choose:1 fixed.
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
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Blocker",
          "raw": "＜Blocker＞"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Barrier",
          "raw": "＜Barrier＞"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          }
        },
        {
          "kind": "Modal",
          "choose": 0,
          "chooseScaling": {
            "per": 5,
            "filter": {},
            "unit": "digivolutionCards"
          },
          "options": [
            [
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
                "amount": -13000,
                "duration": "untilOpponentTurnEnd"
              }
            ],
            [
              {
                "kind": "SecurityManipulation",
                "op": "trashTop",
                "controller": "opponent",
                "amount": 1
              },
              {
                "kind": "SecurityManipulation",
                "op": "addTop",
                "controller": "mine",
                "from": [
                  "deck"
                ],
                "amount": 1
              }
            ]
          ]
        }
      ],
      "frequency": "OncePerTurn"
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
              ]
            },
            "count": 1
          }
        },
        {
          "kind": "Modal",
          "choose": 0,
          "chooseScaling": {
            "per": 5,
            "filter": {},
            "unit": "digivolutionCards"
          },
          "options": [
            [
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
                "amount": -13000,
                "duration": "untilOpponentTurnEnd"
              }
            ],
            [
              {
                "kind": "SecurityManipulation",
                "op": "trashTop",
                "controller": "opponent",
                "amount": 1
              },
              {
                "kind": "SecurityManipulation",
                "op": "addTop",
                "controller": "mine",
                "from": [
                  "deck"
                ],
                "amount": 1
              }
            ]
          ]
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX12-037", compiled);
