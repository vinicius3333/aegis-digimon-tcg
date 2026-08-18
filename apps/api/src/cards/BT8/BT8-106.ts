// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// "[Main] Reveal top 3. Play any number of [Mamemon]-named Digimon whose total play
// costs add up to 15 or less without paying memory costs. Delete 1 opponent Digimon
// with play cost ≤6 for each Digimon played by this effect. Trash the remaining cards."
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
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
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Mamemon"
                    ],
                    "match": "name"
                  }
                ]
              },
              "count": "all",
              "costBudget": 15,
              "to": "play",
              "optional": true
            }
          ],
          "rest": "trash",
          "trackPlayedCount": "mamemonPlayed"
        },
        {
          "kind": "RepeatPerCount",
          "countSource": "mamemonPlayed",
          "action": {
            "kind": "Delete",
            "target": {
              "filter": {
                "controller": "opponent",
                "kind": [
                  "Digimon"
                ],
                "playCostLte": 6
              },
              "count": 1
            }
          }
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "ActivateMain"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT8-106", compiled);
