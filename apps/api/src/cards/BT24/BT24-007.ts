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
          event: "whenHandTrashed",
          fireCondition: { kind: "triggerHandTrashedSeat", seat: "mine" },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  zone: "trash",
                  kind: ["Digimon"],
                  levelComparison: { op: "gte", value: 4 },
                  nameOrTrait: [
                    { tokens: ["Demon"], match: "trait" },
                    { tokens: ["Titan"], match: "trait" },
                  ],
                },
                count: 1,
              },
              from: ["trash"],
              fromTriggerHandTrash: true,
              payCost: true,
              reduceCostBy: 2,
              optional: true,
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
};

registerIrCard("BT24-007", compiled);
