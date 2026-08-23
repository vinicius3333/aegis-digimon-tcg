// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Jamming",
          raw: "＜Jamming＞",
        },
      ],
    },
    {
      trigger: ["WhenDigivolving", "WhenAttacking"],
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -4000,
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: ["EndOfAttack", "OnDeletion"],
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              hasInheritedEffects: true,
              controller: "mine",
              kind: ["Tamer"],
              colors: ["Yellow", "Black", "Purple"],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
        {
          kind: "Draw",
          controller: "mine",
          amount: 2,
          cost: {
            kind: "place",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Hybrid", "Ten Warriors"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              from: ["hand"],
              underFilter: {
                or: [
                  {
                    isSelfRef: true,
                  },
                  {
                    controller: "mine",
                    kind: ["Tamer"],
                  },
                ],
              },
            },
            raw: "by placing 1 [Hybrid] or [Ten Warriors] trait card from your hand under this Digimon or your Tamers",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -4000,
          duration: "forTheTurn",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Koji Minamoto"],
      cost: 3,
      isAlternate: true,
      minTraitStackCount: 2,
      minTraitStackTraits: ["Hybrid"],
    },
  ],
};

registerIrCard("AD1-015", compiled);
