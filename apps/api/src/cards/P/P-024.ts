// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [Main]: If you have [Tai Kamiya] in play, you may place 1 of your [Agumon] cards
// at the bottom of its owner's deck. If you do, <Draw 3> and trash all digivolution
// cards of that Digimon.
// KB Q4133: must have a card literally named "Tai Kamiya" (not "Tai Kamiya (V-Tamer)").
// KB Q4134: must be literally named "Agumon" (not ToyAgumon etc).
// Returning the Agumon permanent already trashes its digivolution cards through the engine's
// permanent-return seam. Do not emit a second synthetic trash action after the permanent is gone.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
      "description": "[Main] If you have [Tai Kamiya] in play, you may place 1 of your [Agumon] cards at the bottom of its owner's deck to trigger ＜Draw 3＞. (Draw 3 cards from your deck.) Trash that Digimon's digivolution cards.",
      "condition": {
        "kind": "youHave",
        "filter": {
          "zone": "battleArea",
          "controllerDefault": "mine",
          "nameOrTrait": [
            {
              "tokens": ["Tai Kamiya"],
              "match": "nameExact"
            }
          ]
        },
        "raw": "you have [Tai Kamiya] in play"
      },
      "optional": true,
      "actions": [
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": ["Agumon"],
                  "match": "nameExact"
                }
              ]
            },
            "count": 1
          },
          "to": "deckBottom",
          "bindResultAs": "returnedAgumon"
        },
        {
          "kind": "Draw",
          "amount": 3,
          "controller": "mine",
          "condition": {
            "kind": "bindingExists",
            "ref": "returnedAgumon"
          }
        }
      ]
    },
    {
      "trigger": "Security",
      "description": "[Security] Add this card to your hand.",
      "actions": [
        {
          "kind": "AddToHandSelf"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("P-024", compiled);
