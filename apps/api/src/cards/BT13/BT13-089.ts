// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "EndOfYourTurn",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "name": "Ravemon"
            },
            "count": 1,
            "location": "trash",
            "controller": "mine"
          },
          "payCost": false,
          "cost": {
            "kind": "deleteOwn",
            "target": {
              "filter": {
                "isSelfRef": true
              },
              "count": 1,
              "isSelf": true
            },
            "raw": "By deleting this Digimon that has a digivolution card with [Bird] or [Avian] in one of its traits"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "OnDeletion",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Falcomon",
                    "Keenan Crier"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "hand",
            "trash"
          ],
          "payCost": false,
          "optional": true
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT13-089", compiled);
