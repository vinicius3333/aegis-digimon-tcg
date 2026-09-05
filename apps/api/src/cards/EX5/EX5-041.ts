// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for EX5-041 (Ebonwumon, Four Sovereigns Digimon).
// Text:
//   <Blast Digivolve>
//   [On Play] [When Digivolving] Suspend up to X of your opponent's Digimon, where X =
//     the number of your Digimon with [Deva] or [Four Sovereigns] traits. During your
//     opponent's next unsuspend phase, all of their Digimon can't unsuspend.
//   [On Deletion] Delete 1 of your opponent's suspended Digimon.
//
// Fixes:
// 1. The second action in [On Play] and [When Digivolving] was Unsuspend(all mine Digimon)
//    which is wrong. Text says opponent's Digimon can't unsuspend during THEIR next unsuspend
//    phase. Correct encoding: Restrict all opponent Digimon from unsuspending until their next
//    unsuspend phase (duration: opponentNextUnsuspendPhase).
// 2. Target for the restriction must be opponent's Digimon (not mine).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Counter",
      actions: [],
      isFromHand: true,
      keywords: [
        {
          keyword: "BlastDigivolve",
          raw: "＜Blast Digivolve＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "scaling",
            upTo: true,
          },
          scaling: {
            per: 1,
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Deva", "Four Sovereigns"],
                  match: "trait",
                },
              ],
            },
            unit: "cards",
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          restriction: "unsuspend",
          duration: "untilOpponentNextUnsuspendPhase",
        },
      ],
    },
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
            count: "scaling",
            upTo: true,
          },
          scaling: {
            per: 1,
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Deva", "Four Sovereigns"],
                  match: "trait",
                },
              ],
            },
            unit: "cards",
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          restriction: "unsuspend",
          duration: "untilOpponentNextUnsuspendPhase",
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              suspended: true,
              kind: ["Digimon"],
            },
            count: 1,
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX5-041", compiled);
