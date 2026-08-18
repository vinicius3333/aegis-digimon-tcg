import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-validated effect IR for BT5-086 (Omnimon).
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [],
      "keywords": [
        {
          "keyword": "Blitz",
          "raw": "＜Blitz＞"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          }
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldLeavePlay",
          "mode": "prevent",
          "leaveCause": "byOpponentEffect",
          "sourceFilter": {
            "isSelfRef": true
          },
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "isSelfRef": true,
                "zone": "digivolutionCards",
                "kind": [
                  "Digimon"
                ],
                "levels": [
                  6
                ]
              },
              "count": 1
            },
            "raw": "by trashing a level 6 Digimon card in this card's digivolution cards"
          },
          "optional": true,
          "raw": "If an opponent's effect would delete this Digimon or return it to its owner's hand or deck, prevent it by trashing a level 6 Digimon card in this card's digivolution cards."
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT5-086", compiled);
