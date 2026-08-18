// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenMovedFromBreeding",
          "actions": [
            {
              "kind": "RevealAdd",
              "revealCount": 3,
              "add": [
                {
                  "filter": {
                    "controllerDefault": "mine",
                    "kind": [
                      "Digimon"
                    ]
                  },
                  "orFilters": [
                    {
                      "controllerDefault": "mine",
                      "kind": [
                        "Tamer"
                      ]
                    }
                  ],
                  "count": 1,
                  "to": "hand"
                }
              ],
              "rest": "deckBottom"
            },
            {
              "kind": "Hatch",
              "optional": true
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT16-082", compiled);
