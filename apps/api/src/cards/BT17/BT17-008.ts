// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Calumon"], match: "name" }],
            orFilters: [
              { controller: "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["Takato Matsuki"], match: "name" }] },
            ],
          },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 3000 } },
                count: 1,
              },
            },
            { kind: "GainMemory", amount: 1, condition: { kind: "ifThisEffectDidNotDelete" } },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "CostModifier",
          mode: "raiseCeiling",
          costType: "dpDeletion",
          amount: 2000,
          condition: { kind: "memoryAtMost", value: 0 },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT17-008", compiled);
