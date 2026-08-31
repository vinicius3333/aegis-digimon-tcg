// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EndOfAttack: deletes self as cost, then deletes 1 opponent Digimon with DP <= self's DP.
// OnDeletion: plays [Gammamon] from trash in suspended state.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "EndOfAttack",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                compareTo: "deletedSelfDP",
              },
            },
            count: 1,
          },
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                isSelfRef: true,
              },
              count: 1,
              isSelf: true,
            },
            raw: "By deleting this Digimon",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Gammamon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          suspended: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Gammamon"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("RB1-029", compiled);
