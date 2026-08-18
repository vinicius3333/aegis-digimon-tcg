import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for BT5-031 (MetalGarurumon).
// Returning a Digimon moves its digivolution cards to trash through the canonical
// Return primitive, so no post-return stack action is necessary.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "On Deletion"
                  ],
                  "match": "text"
                }
              ]
            },
            "count": 1
          },
          "to": "deckBottom",
          "condition": {
            "kind": "selfDigivolutionStackHasTrait",
            "filter": {
              "nameOrTrait": [
                {
                  "tokens": [
                    "Garurumon"
                  ],
                  "match": "name"
                }
              ],
              "excludeNames": [
                "KendoGarurumon"
              ]
            },
            "raw": "a Digimon card with [Garurumon] in its name other than [KendoGarurumon] is in this Digimon's digivolution cards"
          }
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "GainMemory",
          "amount": 1
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT5-031", compiled);
