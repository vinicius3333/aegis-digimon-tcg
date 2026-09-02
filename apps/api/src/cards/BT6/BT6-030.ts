// HAND-FIXED IR for BT6-030 (Gabumon - Bond of Friendship) — do not regenerate over
// this file. The generated second [When Attacking] clause miscompiled the target
// cleanup as a field-Trash of ALL MY Digimon. SelectBind keeps the returned target
// stable, then the canonical Return-to-deck primitive moves that target's top card
// to the deck bottom and trashes its attached digivolution cards as rules cleanup.
// Per Q1399, that explanatory cleanup must not emit whenDigivolutionTrashed.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Tamer"],
            },
            raw: "you have a Tamer in play",
          },
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 5,
              },
            },
            count: 1,
            bindAs: "returnTarget",
          },
        },
        {
          kind: "Return",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "returnTarget",
          },
          to: "deckBottom",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT6-030", compiled);
