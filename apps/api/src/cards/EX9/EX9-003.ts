// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX9-003 Tokomon (DigiEgg)
// Inherited: [Your Turn] [Once Per Turn] When this Digimon with face-down digivolution
// cards would digivolve into a [Ver.3] trait Digimon card, reduce the digivolution cost by 1.
// Q4743: Cost reduced by 3 when combined with EX9-070 Delay (which adds 2 face-down cards);
// confirms this card's -1 stacks with other reductions.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldDigivolve",
          "sourceFilter": {
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ],
            "hasFaceDownDigivolutionCard": true
          },
          "into": {
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Ver.3"
                ],
                "match": "trait"
              }
            ]
          },
          "actions": [
            {
              "kind": "Replacement",
              "event": "wouldDigivolve",
              "mode": "reduceCost",
              "amount": 1,
              "raw": "reduce the digivolution cost by 1"
            }
          ]
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX9-003", compiled);
