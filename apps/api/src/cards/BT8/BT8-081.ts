// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "EndOfAttack",
      "actions": [
        {
          "kind": "Digivolve",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "into": {
            "filter": {
              "controllerDefault": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Rasenmon"
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
          "payCost": false,
          "ignoreReqs": true,
          "optional": true
        }
      ]
    },
    {
      "trigger": "EndOfYourTurn",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "trashTop",
          "controller": "mine",
          "amount": 1
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "onDigiBurstCardDiscarded",
          "sourceFilter": {
            "isSelfRef": true
          },
          "effectSourceFilter": {
            "controllerDefault": "mine",
            "nameOrTrait": [
              {
                "tokens": [
                  "Rasenmon"
                ],
                "match": "name"
              }
            ]
          },
          "actions": [
            {
              "kind": "Unsuspend",
              "target": {
                "filter": {
                  "controller": "mine",
                  "kind": ["Digimon"]
                },
                "count": 1,
                "isSelf": true,
                "bindAs": "unsuspendedTarget"
              }
            },
            {
              "kind": "ModifyDP",
              "target": {
              "filter": {},
              "count": 1,
                "fromSelectionRef": "unsuspendedTarget",
                "sameTarget": true
              },
              "amount": 3000,
              "duration": "forTheTurn"
            }
          ]
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT8-081", compiled);
