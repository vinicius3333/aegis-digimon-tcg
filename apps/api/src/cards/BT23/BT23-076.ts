// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "toHand",
          "controller": "mine",
          "amount": 1,
          "toTop": true
        }
      ],
      "keywords": [
        {
          "keyword": "Recovery",
          "amount": 1,
          "raw": "＜Recovery +1 (Deck)＞"
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenSuspended",
          "actions": [
            {
              "kind": "Digivolve",
              "target": {
                "filter": {
                  "controller": "mine",
                  "excludeSelf": true,
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1
              },
              "into": {
                "controllerDefault": "mine",
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Huckmon"
                    ],
                    "match": "name"
                  },
                  {
                    "tokens": [
                      "Royal Knight",
                      "CS"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "from": [
                "hand",
                "trash"
              ],
              "reduceCost": 1,
              "optional": true
            }
          ]
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT23-076", compiled);
