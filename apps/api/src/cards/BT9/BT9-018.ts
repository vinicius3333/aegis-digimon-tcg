// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored IR for BT9-018 (Dinorexmon).
//
// Audit fixes:
//
// 1. [When Digivolving] text says:
//    "For each Tamer your opponent has in play, suspend 1 of your opponent's Digimon and gain
//    1 memory." Both clauses scale by Tamer count. KB Q1817 confirms the memory gain still
//    uses the full Tamer count when fewer Digimon are available to suspend.
//
// 2. [All Turns][Once Per Turn] prior IR had a bare Delete without a trigger condition.
//    Text says "When an opponent's Digimon with 6000 DP or less BECOMES SUSPENDED, you may
//    delete that Digimon." This is a SubTrigger on whenSuspended (the previously-dead "whenDigimonSuspended" name collapsed onto it) with DP filter.
//    KB Q1818: effect is optional (you may decline; if you do, OncePerTurn is not consumed).
//    KB Q1820: can fire for multiple simultaneously suspended Digimon.
//    Fix: SubTrigger on whenSuspended (the previously-dead "whenDigimonSuspended" name collapsed onto it), sourceFilter opponent Digimon DP≤6000, optional Delete.

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          scaling: {
            per: 1,
            filter: {
              zone: "battleArea",
              controller: "opponent",
              kind: ["Tamer"],
            },
            unit: "cards",
          },
        },
        {
          kind: "GainMemory",
          amount: 1,
          scaling: {
            per: 1,
            filter: {
              zone: "battleArea",
              controller: "opponent",
              kind: ["Tamer"],
            },
            unit: "cards",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: {
            controller: "opponent",
            kind: ["Digimon"],
            dp: {
              op: "lte",
              value: 6000,
            },
          },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: "all",
                sourceRef: "triggerSubject",
              },
              optional: true,
              preserveOncePerTurnOnDecline: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT9-018", compiled);
