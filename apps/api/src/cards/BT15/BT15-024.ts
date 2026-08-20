// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [When Digivolving]: if you have Matt Ishida Tamer → Draw 1.
// If you don't → you may play 1 Matt Ishida Tamer from hand with play cost reduced by 3.
// [When Attacking] (inherited) [Once Per Turn]: Draw 1.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 1,
          "condition": {
            "kind": "youHave",
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Tamer"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Matt Ishida"
                  ],
                  "match": "name"
                }
              ]
            },
            "raw": "you have a Tamer with [Matt Ishida] in its name"
          }
        },
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Tamer"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Matt Ishida"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "hand"
          ],
          "payCost": true,
          "reduceCostBy": 3,
          "condition": {
            "kind": "youHaveNone",
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Tamer"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Matt Ishida"
                  ],
                  "match": "name"
                }
              ]
            },
            "raw": "you don't have a Tamer with [Matt Ishida] in its name"
          },
          "optional": true
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Draw",
          "controller": "mine",
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

registerIrCard("BT15-024", compiled);
export { compiled };
