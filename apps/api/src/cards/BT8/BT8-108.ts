// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored IR for BT8-108 (Mist Memory Boost!).
//
// Audit fixes:
//
// 1. [Main] first effect: "Trash the top 2 cards of your deck and <Draw 1>. Then, place
//    this card in your battle area." Prior IR trashed only 1 card (non-deck) and had no Draw.
//    Fix: TrashTopDeck with amount:2, then Draw 1, then PlaceInBattleAreaSelf.
//
// 2. [Main] second effect: <Delay>. Gain 2 memory. This is correctly encoded as a separate
//    effect with keyword:Delay — no change needed here.

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "TrashTopDeck",
          "controller": "mine",
          "amount": 2
        },
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 1
        },
        {
          "kind": "PlaceInBattleAreaSelf"
        }
      ]
    },
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "GainMemory",
          "amount": 2
        }
      ],
      "keywords": [
        {
          "keyword": "Delay",
          "raw": "＜Delay＞"
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "PlaceInBattleAreaSelf"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT8-108", compiled);
