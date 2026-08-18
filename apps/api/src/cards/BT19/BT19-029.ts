// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "GainMemory",
          "amount": 1,
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "controller": "mine",
                "zone": "security",
                "position": "top"
              },
              "count": 1
            },
            "raw": "By trashing your top security card"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldLeavePlay",
          "leaveCause": "opponentEffect",
          "sourceFilter": {
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ],
            "colors": [
              "Yellow"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Data"
                ],
                "match": "trait"
              },
              {
                "tokens": [
                  "Witchelny"
                ],
                "match": "trait",
                "orPrevious": true
              }
            ]
          },
          "actions": [],
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "controller": "mine",
                "zone": "security",
                "position": "top"
              },
              "count": 1
            },
            "raw": "by trashing your top security card, it doesn't leave"
          }
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT19-029", compiled);
