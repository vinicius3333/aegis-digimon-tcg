// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT9-055 GrandisKuwagamon
// Digivolve: 1 from [GranKuwagamon]
// [When Digivolving] Suspend 1 opponent Digimon. If this Digimon is attacking, you may
//   switch the attack target to 1 of your opponent's suspended Digimon.
// [Your Turn] This Digimon gets +4000 DP.
// [When Attacking][Once Per Turn] If [GranKuwagamon] or [X Antibody] (card name, not
//   trait — KB Q1850) is in this Digimon's digivolution cards, suspend 1 opponent Digimon
//   and unsuspend this Digimon.
export const compiled: CompiledCard = {
  effects: [
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
            count: 1,
          },
        },
        {
          kind: "RedirectAttack",
          target: {
            filter: {
              controller: "opponent",
              suspended: true,
              kind: ["Digimon"],
            },
            count: 1,
          },
          condition: {
            kind: "duringAttack",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 4000,
          duration: "permanent",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["GranKuwagamon", "X Antibody"],
                  match: "nameExact",
                },
              ],
            },
            raw: "[GranKuwagamon] or [X Antibody] is in this Digimon's digivolution cards",
          },
        },
        {
          kind: "Unsuspend",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["GranKuwagamon", "X Antibody"],
                  match: "nameExact",
                },
              ],
            },
            raw: "[GranKuwagamon] or [X Antibody] is in this Digimon's digivolution cards",
          },
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["GranKuwagamon"],
      cost: 1,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT9-055", compiled);
