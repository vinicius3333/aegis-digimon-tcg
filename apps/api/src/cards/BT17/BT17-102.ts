// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const tamer = {
  controller: "mine",
  kind: ["Tamer"],
  nameOrTrait: [{ tokens: ["Tai Kamiya", "Kari Kamiya"], match: "name" }],
};
export const compiled: CompiledCard = {
  digivolutionRequirement: [{ level: 3, names: ["Agumon"], cost: 2, isAlternate: true }],
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 3000,
          duration: "forTheTurn",
          condition: { kind: "selfHasName", names: ["Koromon"] },
        },
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", relativeToSource: true } },
            count: 1,
          },
        },
      ],
    },
    { trigger: "AllTurns", actions: [{ kind: "DynamicDigivolutionNames" }] },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          optional: true,
          options: [
            [
              {
                kind: "PlayWithoutCost",
                target: { filter: tamer, count: 1 },
                from: ["hand"],
                payCost: false,
              },
            ],
            [{ kind: "Hatch" }],
          ],
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          optional: true,
          options: [
            [
              {
                kind: "PlayWithoutCost",
                target: { filter: tamer, count: 1 },
                from: ["hand"],
                payCost: false,
              },
            ],
            [{ kind: "Hatch" }],
          ],
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT17-102", compiled);
