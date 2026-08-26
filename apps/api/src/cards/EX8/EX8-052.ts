// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "trash",
          controller: "opponent",
          target: { filter: { controller: "opponent" }, count: 1 },
          from: ["security"],
          cost: {
            kind: "trash",
            target: { filter: { zone: "battleArea", controller: "mine", kind: ["Option"] }, count: 1 },
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlaceInBattleAreaSelf",
          target: {
            filter: {
              nameOrTrait: [
                {
                  tokens: ["Device"],
                  match: "trait",
                },
              ],
              kind: ["Option"],
              controller: "mine",
            },
            count: 1,
            from: ["hand", "trash"],
          },
          condition: {
            kind: "anyOf",
            conditions: [
              {
                kind: "selfDigivolutionStackCountAtLeast",
                count: 1,
                filter: {
                  nameOrTrait: [{ tokens: ["Cyberdramon"], match: "name" }],
                },
              },
              {
                kind: "selfDigivolutionStackCountAtLeast",
                count: 1,
                filter: {
                  nameOrTrait: [{ tokens: ["X Antibody"], match: "trait" }],
                },
              },
            ],
            raw: "[Cyberdramon]/[X Antibody] is in this Digimon's digivolution cards",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 2,
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "battleArea",
                controller: "mine",
                kind: ["Option"],
              },
              count: 1,
            },
            raw: "By trashing 1 of your Option cards in the battle area",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Cyberdramon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};
registerIrCard("EX8-052", compiled);
