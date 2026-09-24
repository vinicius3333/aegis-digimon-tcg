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
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] For each of your Digimon with the [Deva]/[Four Sovereigns] trait, suspend 1 of your opponent's Digimon.",
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            countModifier: {
              amount: 1,
              scaling: {
                per: 1,
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  excludeSelf: true,
                  nameOrTrait: [
                    { tokens: ["Deva"], match: "trait" },
                    { tokens: ["Four Sovereigns"], match: "trait" },
                  ],
                },
                unit: "cards",
              },
            },
            upTo: true,
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
          effectTextPart:
            "[On Play] [When Digivolving] For each of your Digimon with the [Deva]/[Four Sovereigns] trait, suspend 1 of your opponent's Digimon.",
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            countModifier: {
              amount: 1,
              scaling: {
                per: 1,
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  excludeSelf: true,
                  nameOrTrait: [
                    { tokens: ["Deva"], match: "trait" },
                    { tokens: ["Four Sovereigns"], match: "trait" },
                  ],
                },
                unit: "cards",
              },
            },
            upTo: true,
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
  digivolutionRequirement: [{ level: 5, traits: ["Deva"], cost: 3, isAlternate: true }],
};

registerIrCard("EX5-041", compiled);
