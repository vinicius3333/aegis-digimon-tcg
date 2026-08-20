import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for EX6-003.
//   'ContainsTraits("Angel") && !ContainsTraits("Fallen Angel")' (documented behavior)
// The original IR listed "Fallen Angel" in the INCLUDE nameOrTrait token set (trait match),
// place as security.
// Fix: use excludeNameOrTrait:{tokens:["Fallen Angel"], match:"trait"} on the placeAsSecurity
// source filter. The engine's definitionMatches (interpreter.ts:226) checks excludeNameOrTrait
// and returns false for any card matching the exclusion.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenAttacking",
      "isInherited": true,
      "frequency": "OncePerTurn",
      "optional": true,
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "toHand",
          "controller": "mine",
          "amount": 1,
          "toTop": true
        },
        {
          "kind": "SecurityManipulation",
          "op": "placeAsSecurity",
          "controller": "mine",
          "source": {
            "filter": {
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Angel",
                    "Archangel",
                    "Three Great Angels"
                  ],
                  "match": "trait"
                }
              ],
              "excludeNameOrTrait": [
                {
                  "tokens": [
                    "Fallen Angel"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "toTop": false
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
};

registerIrCard("EX6-003", compiled);
