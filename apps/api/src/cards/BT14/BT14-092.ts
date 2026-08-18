// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "SelectBind",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1,
            "bindAs": "chosenDigimon"
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
            "count": 3
          },
          "restriction": "attackOrBlock",
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "raw",
            "raw": "opponent Digimon has as many or fewer digivolution cards as the chosen Digimon"
          }
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
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
          "restriction": "attack",
          "duration": "untilOpponentTurnEnd"
        },
        {
          "kind": "AddToHandSelf"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "partial",
  "residual": [
    "opponent Digimon filter: as many or fewer digivolution cards as the chosen Digimon (needs engine digivolutionCount relativeTo)"
  ]
};

registerIrCard("BT14-092", compiled);
