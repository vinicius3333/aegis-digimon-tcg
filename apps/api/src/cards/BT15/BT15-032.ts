// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Return",
          "target": {
            "filter": {
              "digivolutionCardsCompareToSource": "lte",
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "to": "hand"
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Return",
          "target": {
            "filter": {
              "digivolutionCardsCompareToSource": "lte",
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "to": "hand"
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    },
    {
      "trigger": "OpponentsTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenOpponentAttacks",
          "raw": "[Opponent's Turn] When an opponent's Digimon attacks, if [Plesiomon]/[X Antibody] is in this Digimon's digivolution cards, gain 2 memory.",
          "actions": [
            {
              "kind": "GainMemory",
              "amount": 2,
              "condition": {
                "kind": "selfHasInDigivolutionCards",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Plesiomon",
                      "X Antibody"
                    ],
                    "match": "name"
                  }
                ],
                "raw": "[Plesiomon]/[X Antibody] is in this Digimon's digivolution cards"
              }
            }
          ]
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT15-032", compiled);
