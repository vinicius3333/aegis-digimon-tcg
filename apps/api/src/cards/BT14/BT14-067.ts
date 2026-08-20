// @ts-nocheck
// Hand-authored override for BT14-067 (Ebemon).
// runtime-effect fix: reveal opponent deck, choose one revealed Digimon as the play-cost
// budget reference, delete opponent Digimon up to that total play cost, then return
// all revealed cards to top or bottom of that deck by the effect controller's choice
// (KB Q2439/Q2440).
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "RevealChooseDeleteBudget",
          "revealCount": 3,
          "revealController": "opponent",
          "chooseFilter": {
            "kind": [
              "Digimon"
            ]
          },
          "deleteFilter": {
            "controller": "opponent",
            "kind": [
              "Digimon"
            ]
          },
          "upTo": true,
          "returnRevealed": "deckTopOrBottom",
          "returnOrder": "controllerChoice",
          "raw": "Your opponent reveals the top 3 cards of their deck. Choose 1 Digimon card among them, and delete up to its play cost's total worth of your opponent's Digimon. Return the revealed cards to the top or bottom of the deck."
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "RevealChooseDeleteBudget",
          "revealCount": 3,
          "revealController": "opponent",
          "chooseFilter": {
            "kind": [
              "Digimon"
            ]
          },
          "deleteFilter": {
            "controller": "opponent",
            "kind": [
              "Digimon"
            ]
          },
          "upTo": true,
          "returnRevealed": "deckTopOrBottom",
          "returnOrder": "controllerChoice",
          "raw": "Your opponent reveals the top 3 cards of their deck. Choose 1 Digimon card among them, and delete up to its play cost's total worth of your opponent's Digimon. Return the revealed cards to the top or bottom of the deck."
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT14-067", compiled);
