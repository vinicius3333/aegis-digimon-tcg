// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "Digivolve",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": ["Digimon"],
              "nameOrTrait": [
                {
                  "tokens": ["Jellymon"],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "into": {
            "controllerDefault": "mine",
            "nameOrTrait": [
              {
                "tokens": ["Thetismon"],
                "match": "name"
              }
            ]
          },
          "from": ["hand"],
          "payCost": true,
          "ignoreRequirements": true,
          "optional": true,
          "additionalCosts": [
            {
              "kind": "place",
              "target": {
                "filter": {
                  "controller": "mine",
                  "kind": ["Digimon"],
                  "nameOrTrait": [
                    {
                      "tokens": ["TeslaJellymon"],
                      "match": "name"
                    }
                  ]
                },
                "count": 1,
                "from": ["hand"]
              },
              "destination": "digivolutionStack",
              "position": "bottom",
              "host": "target",
              "raw": "by placing 1 [TeslaJellymon] from your hand under 1 of your [Jellymon]s"
            }
          ]
        }
      ],
      "isFromHand": true
    },
    {
      "trigger": "EndOfAttack",
      "actions": [
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "cost": {
            "kind": "return",
            "target": {
              "filter": {
                "zone": "trash",
                "controller": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Jellymon"
                    ],
                    "match": "text"
                  }
                ]
              },
              "count": 3
            },
            "raw": "By returning 3 cards with [Jellymon] in their text from your trash at the bottom of the deck in any order"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT13-028", compiled);
