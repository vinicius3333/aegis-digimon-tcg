// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [Main]: player picks 1 card with [Deva]/[Four Sovereigns] trait from revealed 3 and
// places it as the bottom digivolution card of 1 of their Digimon OR adds it to hand.
// Encoded as a RevealAdd slot with an alternate disposition; the interpreter
// prompts for place-under versus hand after the card is selected.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "WaiveColorRequirement",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "condition": {
            "kind": "youHave",
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Deva",
                    "Four Sovereigns"
                  ],
                  "match": "trait"
                }
              ]
            },
            "raw": "you have a Digimon with the [Deva]/[Four Sovereigns] trait"
          }
        }
      ]
    },
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
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Deva",
                      "Four Sovereigns"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "to": "placeUnder",
              "underFilter": {
                "controllerDefault": "mine",
                "kind": [
                  "Digimon"
                ]
              },
              "orDispositions": [
                {
                  "to": "hand"
                }
              ]
            }
          ],
          "rest": "deckTopOrBottom"
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
registerIrCard("EX5-071", compiled);
