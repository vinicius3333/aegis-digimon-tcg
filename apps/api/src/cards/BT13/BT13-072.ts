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
          "kind": "RevealAdd",
          "revealCount": 3,
          "add": [
            {
              "filter": {
                "controllerDefault": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "X Antibody"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "to": "placeUnder"
            }
          ],
          "rest": "trash"
        },
        {
          "kind": "Restrict",
          "target": {"filter": {"isSelfRef": true}, "count": 1, "isSelf": true},
          "restriction": "dpImmune",
          "duration": "untilOpponentTurnEnd",
      "condition": {"kind": "ifThisEffectActed", "raw": "you did"}
        }
      ]
    },
    {
      "trigger": "EndOfYourTurn",
      "actions": [
        {
          "kind": "PlaceUnder",
          "target": {
            "filter": {
              "zone": "hand",
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "X Antibody"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1,
            "from": [
              "hand"
            ]
          },
          "optional": true
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT13-072", compiled);
