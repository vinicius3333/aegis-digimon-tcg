// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// P-054 Seraphimon — hand-corrected IR.
// [When Digivolving] If you have a Tamer in play, <Recovery +1 (Deck)>.
//   Recovery +1 (Deck) = place the top card of your deck on top of your security stack.
//   Encoded as SecurityManipulation with implicit top-of-deck source (no chooser).
// [On Deletion] <Recovery +1 (Deck)>.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "addTop",
          "controller": "mine",
          "source": "deck",
          "amount": 1,
          "condition": {
            "kind": "youHave",
            "filter": {
              "zone": "battleArea",
              "controllerDefault": "mine",
              "kind": ["Tamer"]
            },
            "raw": "you have a Tamer in play"
          }
        }
      ]
    },
    {
      "trigger": "OnDeletion",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "addTop",
          "controller": "mine",
          "source": "deck",
          "amount": 1
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("P-054", compiled);
