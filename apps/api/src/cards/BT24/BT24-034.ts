// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const securityForTamer = {
  kind: "CostGatedBlock",
  cost: {
    kind: "securityToHand",
    raw: "By adding your top security card to the hand",
  },
  optional: true,
  abortOnDecline: true,
  actions: [
    {
      kind: "PlayWithoutCost",
      target: {
        filter: {
          controller: "mine",
          kind: ["Tamer"],
          nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
          excludeSameNameAsOwnTamers: true,
        },
        count: 1,
      },
      from: ["hand"],
      payCost: false,
      optional: true,
    },
  ],
};

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
          keyword: "Barrier",
          raw: "＜Barrier＞",
        },
      ],
    },
    {
      trigger: "WhenMoving",
      actions: [securityForTamer],
    },
    {
      trigger: "OnPlay",
      actions: [securityForTamer],
    },
    {
      trigger: "WhenDigivolving",
      actions: [securityForTamer],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Barrier",
          raw: "＜Barrier＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Elecmon"],
      cost: 2,
      isAlternate: true,
    },
    {
      level: 3,
      traits: ["TS"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT24-034", compiled);
