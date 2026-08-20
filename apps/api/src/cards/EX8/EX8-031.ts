// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q5511-Q5515: triggers when you USE an Option card with use cost 2+; does not
// trigger for Security activations or Delay activations. Cost reduction to the paid
// amount doesn't affect whether it triggers — original use cost is checked.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Return",
          "target": {
            "filter": {
              "zone": "trash",
              "controller": "mine",
              "kind": [
                "Option"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Plug-In"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "to": "hand"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Return",
          "target": {
            "filter": {
              "zone": "trash",
              "controller": "mine",
              "kind": [
                "Option"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Plug-In"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "to": "hand"
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenOptionUsed",
          "fireCondition": {
            "kind": "triggerOptionCostAtLeast",
            "value": 2,
            "raw": "when you use an Option card with a use cost of 2 or more"
          },
          "actions": [
            {
              "kind": "ModifyDP",
              "target": {
                "filter": {
                  "controller": "opponent",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1
              },
              "amount": -2000,
              "duration": "forTheTurn"
            }
          ]
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Renamon"
      ],
      "cost": 0,
      "isAlternate": true
    }
  ]
};

registerIrCard("EX8-031", compiled);
