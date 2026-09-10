import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
        },
        {
          kind: "Return",
          target: {
            filter: {
              controller: "mine",
              zone: "trash",
              kind: ["Option"],
              nameOrTrait: [
                {
                  tokens: ["Plug-In"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          to: "hand",
          scaling: {
            per: 1,
            filter: {
              controller: "mine",
              kind: ["Tamer"],
            },
            unit: "cards",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOptionUsed",
          fireCondition: {
            kind: "triggerOptionCostAtLeast",
            value: 2,
            raw: "when you use an Option card with a cost of 2 or more",
          },
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
              amount: -3000,
              duration: "forTheTurn",
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX2-024", compiled);
