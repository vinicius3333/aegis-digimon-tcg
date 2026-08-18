// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT7-070 Wendigomon
// [When Digivolving] "You may reveal the top 5 cards of your deck. Trash all Tamer cards
// among them. Place the remaining cards at the bottom of your deck in any order."
// Q1624: optional to activate at all; once you reveal you MUST trash all revealed Tamers.
// Q1625: confirmed — must trash all Tamer cards revealed.
// The RevealAdd encodes: reveal 5, trash all Tamers among revealed set (trashFilter),
// place rest at deckBottom. The prior IR used a separate Trash action with no zone
// restriction (would trash any Tamer in play anywhere) — fixed to use RevealAdd.trashFilter.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "RevealAdd",
          "revealCount": 5,
          "add": [],
          "trashFilter": {
            "kind": ["Tamer"]
          },
          "rest": "deckBottom",
          "optional": true
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenPlayed",
          "sourceFilter": {
            "controllerDefault": "mine",
            "kind": [
              "Tamer"
            ]
          },
          "actions": [
            {
              "kind": "Draw",
              "controller": "mine",
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

registerIrCard("BT7-070", compiled);
