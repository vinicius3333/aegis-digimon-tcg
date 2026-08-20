// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX4-014 Gaossmon
// Text: "[Your Turn][Once Per Turn] When a card with the [Blue Flare] trait is played, <Draw 1>.
//   When a card with the [Twilight] trait is played, return 1 Digimon card with DigiXros
//   requirements from your trash to your hand."
// KB Q3453: also triggers when opponent's Digimon with [Blue Flare] or [Twilight] is played
// KB Q3454: two separate triggers share Once Per Turn; last activated takes precedence
// KB Q3455: this card's own play (has [Blue Flare] trait) triggers Draw 1
// KB Q3456: card with both traits triggers both effects
// Fixes:
//   - Remove controllerDefault "mine" — both players' plays count
//   - Add second SubTrigger for [Twilight] trait play → return from trash
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenPlayed",
          "sourceFilter": {
            "nameOrTrait": [
              {
                "tokens": [
                  "Blue Flare"
                ],
                "match": "trait"
              }
            ]
          },
          "actions": [
            {
              "kind": "Draw",
              "controller": "mine",
              "amount": 1
            }
          ]
        },
        {
          "kind": "SubTrigger",
          "event": "whenPlayed",
          "sourceFilter": {
            "nameOrTrait": [
              {
                "tokens": [
                  "Twilight"
                ],
                "match": "trait"
              }
            ]
          },
          "actions": [
            {
              "kind": "Return",
              "target": {
                "filter": {
                  "zone": "trash",
                  "controller": "mine",
                  "kind": [
                    "Digimon"
                  ],
                  "hasDigiXrosRequirements": true
                },
                "count": 1
              },
              "to": "hand"
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

registerIrCard("EX4-014", compiled);
