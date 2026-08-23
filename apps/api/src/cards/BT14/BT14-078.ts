// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [On Deletion]: trash up to 3 (optional "you may"), then delete is mandatory (no "you may").
// The deletion ceiling is driven by the preceding hand-trash count.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
        },
        {
          kind: "Draw",
          controller: "mine",
          amount: 2,
        },
        {
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Loogamon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          to: "hand",
          optional: true,
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "Trash",
          target: {
            filter: {
              zone: "hand",
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Dark Animal", "SoC"],
                  match: "trait",
                },
              ],
            },
            count: 3,
            upTo: true,
          },
          trackCount: "trashedThisEffect",
          optional: true,
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 3,
              },
            },
            count: 1,
          },
          scaling: {
            per: 1,
            unit: "namedCount",
            countSource: "trashedThisEffect",
            levelCeilingAdd: 1,
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT14-078", compiled);
