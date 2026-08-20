// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored IR for BT22-070 (DarkTyrannomon X Antibody).
// digivolutionRequirement: Lv.4 Tyrannomon in name, w/o [X Antibody] trait, cost 0.
// [When Digivolving]: condition checks digivolution stack for card named [DarkTyrannomon]
//   OR card with trait [X Antibody] (two separate nameOrTrait entries with OR semantics).
// [When Attacking]: digivolve into [Tyrannomon]-name or [Dinosaur]-trait card from hand.
// [All Turns] inherited: whenDeletesInBattle → gain 1 memory, but NOT when simultaneous
//   deletion (Q4929: can't activate if both die at same timing).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
            },
            count: 1,
          },
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["DarkTyrannomon"],
                  match: "name",
                },
                {
                  tokens: ["X Antibody"],
                  match: "trait",
                },
              ],
            },
            raw: "[DarkTyrannomon] in name or [X Antibody] trait is in this Digimon's digivolution cards",
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Tyrannomon"],
                match: "name",
              },
              {
                tokens: ["Dinosaur"],
                match: "trait",
              },
            ],
          },
          from: ["hand"],
          payCost: true,
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: { isSelfRef: true },
          notSimultaneous: true,
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
            },
          ],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      names: ["Tyrannomon"],
      excludeTraits: ["X Antibody"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT22-070", compiled);
