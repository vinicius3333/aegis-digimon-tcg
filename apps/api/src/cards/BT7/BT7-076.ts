// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT7-076 Orochimon
// effectText: When you trash THIS card in your hand using one of your effects, Draw 1.
// inheritedEffectText: [When Attacking][Once Per Turn] You may trash 1 card in your hand to gain 1 memory.
//
// The main effect is a self-watcher: fires only when this specific card instance is
// trashed from hand. sourceFilter.isSelfRef gates on "this card".
// The inherited [When Attacking] is "You may trash 1 hand card" (cost) → "gain 1 memory".
//
// Migration note: was the dead "whenHandCardTrashed" name with the wrong field key
// (triggerFilter, which only `onAddDigivolutionCards`-family events read) — collapsed onto the
// already-live "whenTrashedFromHand" (per-card hand-trash event) with the correct
// "sourceFilter" key its own gate reads.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenTrashedFromHand",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Draw",
              controller: "mine",
              amount: 1,
            },
          ],
          raw: "When you trash this card in your hand using one of your effects, Draw 1",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Trash",
          target: {
            filter: {
              zone: "hand",
              controller: "mine",
            },
            count: 1,
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "GainMemory",
          amount: 1,
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-076", compiled);
