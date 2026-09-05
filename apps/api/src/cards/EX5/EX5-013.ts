// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for EX5-013 (Zhuqiaomon).
// Text:
//   <Blast Digivolve>
//   [When Digivolving][When Attacking][Once Per Turn] By deleting 1 Digimon with
//     the [Deva] trait or 6000 DP or less (ANY Digimon on the field, not just mine),
//     this Digimon gains <Security Attack +1> for the turn.
//   [On Deletion] Delete 1 of your opponent's Digimon with the highest DP.
//
// KB Q3550: Can delete an OPPONENT'S Digimon with [Deva] trait or 6000 DP or less.
//
// Fixes:
// 1. The cost filter must be OR logic: [Deva] trait OR 6000 DP or less.
//    The old IR used AND logic (both conditions).
// 2. The cost filter must allow any Digimon (not just mine): controller restriction removed.
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
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: 1,
            raw: "＜Security Attack +1＞",
          },
          duration: "forTheTurn",
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                kind: ["Digimon"],
                or: [
                  {
                    nameOrTrait: [
                      {
                        tokens: ["Deva"],
                        match: "trait",
                      },
                    ],
                  },
                  {
                    dp: {
                      op: "lte",
                      value: 6000,
                    },
                  },
                ],
              },
              count: 1,
            },
            raw: "By deleting 1 Digimon with the [Deva] trait or 6000 DP or less",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: 1,
            raw: "＜Security Attack +1＞",
          },
          duration: "forTheTurn",
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                kind: ["Digimon"],
                or: [
                  {
                    nameOrTrait: [
                      {
                        tokens: ["Deva"],
                        match: "trait",
                      },
                    ],
                  },
                  {
                    dp: {
                      op: "lte",
                      value: 6000,
                    },
                  },
                ],
              },
              count: 1,
            },
            raw: "By deleting 1 Digimon with the [Deva] trait or 6000 DP or less",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "highestDP",
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

registerIrCard("EX5-013", compiled);
