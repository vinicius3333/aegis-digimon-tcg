// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
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
              "nameOrTrait": [{"tokens": ["Angoramon"], "match": "name"}]
            },
            "count": 1
          },
          "into": {
            "controllerDefault": "mine",
            "nameOrTrait": [{"tokens": ["Lamortmon"], "match": "name"}]
          },
          "from": ["hand"],
          "payCost": true,
          "costOverride": 3,
          "ignoreRequirements": true,
          "optional": true,
          "additionalCosts": [
            {
              "kind": "place",
              "target": {
                "filter": {
                  "controller": "mine",
                  "kind": ["Digimon"],
                  "nameOrTrait": [{"tokens": ["SymbareAngoramon"], "match": "name"}]
                },
                "count": 1,
                "from": ["hand"]
              },
              "destination": "digivolutionStack",
              "position": "bottom",
              "host": "target",
              "raw": "by placing 1 [SymbareAngoramon] from your hand as 1 of your [Angoramon]'s bottom digivolution card"
            }
          ]
        }
      ],
      "isFromHand": true
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenDeletesInBattle",
          "actions": [
            {
              "kind": "SecurityManipulation",
              "op": "trashTop",
              "controller": "opponent",
              "amount": 1
            }
          ]
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT13-055", compiled);
