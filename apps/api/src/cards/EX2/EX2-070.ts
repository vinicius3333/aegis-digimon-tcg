// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q&A Q3357: ignoring digivolution requirements is NOT allowed.
// KB Q&A Q3360: the 3-or-less cost restriction refers to the printed digivolution cost on the target card
//   (not a reduced cost); encode as digivolutionCostMax filter on 'into'.
// KB Q&A Q3358: special digivolution cost ≤ 3 is eligible.
const compiled: CompiledCard = {
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
              "zone": "battleArea",
              "controllerDefault": "mine",
              "kind": [
                "Tamer"
              ]
            },
            "raw": "you have a Tamer in play"
          }
        }
      ]
    },
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 1
        },
        {
          "kind": "Digivolve",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "into": {
            "controllerDefault": "mine",
            "zone": "hand",
            "kind": [
              "Digimon"
            ],
            "digivolutionCostMax": 3
          },
          "payCost": false,
          "ignoreDigivolutionRequirements": false,
          "optional": true
        }
      ]
    },
    {
      "trigger": "Security",
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
              "count": 1,
              "to": "hand"
            }
          ],
          "rest": "deckBottom"
        },
        {
          "kind": "AddToHandSelf"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX2-070", compiled);
