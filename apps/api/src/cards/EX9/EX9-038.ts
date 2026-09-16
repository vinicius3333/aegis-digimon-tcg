import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Training",
          raw: "＜Training＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "ConditionalBranch",
          condition: { kind: "true" },
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "place",
            faceDown: true,
            target: {
              filter: {
                controller: "mine",
                zone: "hand",
              },
              count: 1,
            },
            raw: "By placing 1 card in your hand face down as this Digimon's bottom digivolution card",
          },
          ifTrue: [
            {
              kind: "Suspend",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
            },
            {
              kind: "Restrict",
              target: {
                filter: {
                  controller: "opponent",
                },
                sameTarget: true,
                count: 1,
              },
              restriction: "unsuspendDuringOwnUnsuspendPhase",
              duration: "untilOpponentNextUnsuspendPhase",
            },
          ],
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "ConditionalBranch",
          condition: { kind: "true" },
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "place",
            faceDown: true,
            target: {
              filter: {
                controller: "mine",
                zone: "hand",
              },
              count: 1,
            },
            raw: "By placing 1 card in your hand face down as this Digimon's bottom digivolution card",
          },
          ifTrue: [
            {
              kind: "Suspend",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
            },
            {
              kind: "Restrict",
              target: {
                filter: {
                  controller: "opponent",
                },
                sameTarget: true,
                count: 1,
              },
              restriction: "unsuspendDuringOwnUnsuspendPhase",
              duration: "untilOpponentNextUnsuspendPhase",
            },
          ],
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Piercing",
          raw: "＜Piercing＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 3,
      traits: ["DM"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX9-038", compiled);
