import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

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
  digivolutionRequirement: [{ level: 5, traits: ["Deva"], cost: 3, isAlternate: true }],
};

registerIrCard("EX5-013", compiled);
