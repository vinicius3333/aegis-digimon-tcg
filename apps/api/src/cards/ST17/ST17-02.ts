// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// ST17-02 Terriermon — hand-fixed IR.
// [Digivolve] [Gummymon]: Cost 0
// [Main][Once Per Turn] You may play 1 green Tamer card or 1 level 3 Digimon card
//   with [Lopmon] in its name from your hand with the play cost reduced by 2.
// [Inherited] [All Turns] While this Digimon is suspended, it gets +1000 DP.
const compiled: CompiledCard = {
  "effects": [
    {
      // [Main][Once Per Turn] You may play 1 green Tamer card OR 1 level 3 Digimon
      // with [Lopmon] in its name from your hand with the play cost reduced by 2.
      // The two alternatives are expressed as filter.or.
      "trigger": "Main",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "zone": "hand",
              "or": [
                {
                  "kind": ["Tamer"],
                  "colors": ["Green"]
                },
                {
                  "kind": ["Digimon"],
                  "levels": [3],
                  "nameOrTrait": [
                    {
                      "tokens": ["Lopmon"],
                      "match": "name"
                    }
                  ]
                }
              ]
            },
            "count": 1
          },
          "from": ["hand"],
          "payCost": true,
          "reduceCostBy": 2,
          "optional": true
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "Aura",
          "target": {
            "filter": { "isSelfRef": true },
            "count": 1,
            "isSelf": true
          },
          "effect": {
            "kind": "modifyDP",
            "amount": 1000
          },
          "while": {
            "kind": "selfIsSuspended",
            "raw": "this Digimon is suspended"
          }
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": ["Gummymon"],
      "cost": 0,
      "isAlternate": true
    }
  ]
};

registerIrCard("ST17-02", compiled);
