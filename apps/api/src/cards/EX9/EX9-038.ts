// @ts-nocheck
// HAND-FIXED — the place cost is "1 card in your hand" (ANY kind, zone hand), not a Digimon-only
// filter as the compiler emitted. Do not regenerate over this file.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
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
