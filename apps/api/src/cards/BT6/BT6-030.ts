// @ts-nocheck
// HAND-FIXED IR for BT6-030 (Gabumon - Bond of Friendship) — do not regenerate over
// this file. The generated second [When Attacking] clause miscompiled "Trash all of
// the digivolution cards of that Digimon" as a field-Trash of ALL MY Digimon. It is
// now: SelectBind the returned target once, TrashDigivolution of ALL of ITS
// digivolution cards (amount 99 — the interpreter clamps to the stack size; there
// is no "all" amount), then Return THAT bound Digimon to the deck bottom. Trashing
// before the return matters: the engine's returnToDeck sends the whole stack to the
// deck, so the explicit trash must strip the digivolution cards first (matching the
// printed outcome: sources to trash, top card to deck bottom).
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "condition": {
            "kind": "youHave",
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Tamer"
              ]
            },
            "raw": "you have a Tamer in play"
          },
          "optional": true
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "SelectBind",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 5
              }
            },
            "count": 1,
            "bindAs": "returnTarget"
          }
        },
        {
          "kind": "TrashDigivolution",
          "target": {
            "filter": {},
            "count": 1,
            "fromSelectionRef": "returnTarget"
          },
          "amount": 99,
          "raw": "Trash all of the digivolution cards of that Digimon."
        },
        {
          "kind": "Return",
          "target": {
            "filter": {},
            "count": 1,
            "fromSelectionRef": "returnTarget"
          },
          "to": "deckBottom"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT6-030", compiled);
