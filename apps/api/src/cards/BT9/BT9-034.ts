// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT9-034 Salamon (X Antibody)
// [When Digivolving]: "Look at the top card of your security stack, and you may add it to
//   your hand. If you do, <Recovery +1 (Deck)>. (Place the top card of your deck on top of
//   your security stack.)"
// Q1833: if you choose not to add to hand, place the card back on top of security face down.
//
// The effect is:
//   1. Look at top security card (reveal to self, mandatory)
//   2. Optional: add it to hand
//      - If added: place top of deck as top security card (Recovery +1)
//      - If not: return it face-down to top of security stack
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "lookAndMayAddToHand",
          "controller": "mine",
          "source": "securityTop",
          "amount": 1,
          "ifAddedToHand": [
            {
              "kind": "SecurityManipulation",
              "op": "addTop",
              "controller": "mine",
              "source": "deck",
              "amount": 1
            }
          ],
          "raw": "Look at the top card of your security stack, and you may add it to your hand. If you do, <Recovery +1 (Deck)>. If not, place it back on top of security face down."
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Salamon"
      ],
      "cost": 0,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT9-034", compiled);
