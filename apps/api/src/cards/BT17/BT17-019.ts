// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "StartOfYourMainPhase",
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
        }
      ]
    },
    {
      "trigger": "EndOfYourTurn",
      "actions": [
        {
          "kind": "DnaDigivolve",
          "materials": [
            {
              "filter": {
                "isSelfRef": true
              },
              "count": 1,
              "zone": "battleArea"
            },
            {
              "filter": {
                "controller": "mine",
                "kind": [
                  "Digimon"
                ],
                "excludeSelf": true
              },
              "count": 1,
              "zone": "battleArea"
            }
          ],
          "into": {
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ],
            "zone": "hand",
            "hasDnaDigivolutionRequirement": true
          },
          "payCost": true,
          "optional": true
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Tsunomon"
      ],
      "cost": 0,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT17-019", compiled);
