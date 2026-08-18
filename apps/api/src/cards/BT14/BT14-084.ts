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
          "op": "placeAsSecurity",
          "controller": "mine",
          "source": {
            "filter": {
              "controllerDefault": "mine",
              "colors": [
                "Yellow"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Vaccine"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "hand"
          ],
          "toTop": false,
          "cost": {
            "kind": "return",
            "target": {
              "filter": {
                "controller": "mine"
              },
              "count": 1
            },
            "raw": "By returning the top card of your security stack to the hand"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenAddSecurity",
          "fireCondition": {
            "kind": "triggerSecurityIsYours"
          },
          "actions": [
            {
              "kind": "GainMemory",
              "amount": 1,
              "cost": {
                "kind": "suspend",
                "target": {
                  "filter": {
                    "isSelfRef": true
                  },
                  "count": 1,
                  "isSelf": true
                },
                "raw": "by suspending this Tamer"
              },
              "optional": true,
              "abortOnDecline": true
            }
          ]
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "payCost": false
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT14-084", compiled);
