// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "addTop",
          "controller": "mine",
          "source": "deck",
          "amount": 1,
          "condition": {
            "kind": "allOf",
            "conditions": [
              {
                "kind": "zoneCount",
                "seat": "mine",
                "zone": "security",
                "op": "lte",
                "value": 3,
                "raw": "you have 3 or fewer security cards"
              },
              {
                "kind": "youHave",
                "filter": {
                  "zone": "battleArea",
                  "controllerDefault": "mine",
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Shu-Chong Wong"
                      ],
                      "match": "name"
                    }
                  ]
                },
                "raw": "[Shu-Chong Wong] in play"
              }
            ],
            "raw": "you have 3 or fewer security cards and [Shu-Chong Wong] in play"
          }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX2-020", compiled);
