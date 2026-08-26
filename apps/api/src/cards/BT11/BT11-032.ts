// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { controller: "mine", kind: ["Tamer"], colors: ["Blue"] }, count: 1 },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controllerDefault: "mine", kind: ["Tamer"], colors: ["Blue"] },
          actions: [{ kind: "Unsuspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } }],
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenUnsuspended",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Return",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  levelComparison: {
                    op: "lte",
                    value: 3,
                    scaling: {
                      per: 1,
                      filter: { zone: "battleArea", controller: "mine", kind: ["Tamer"], colors: ["Blue"] },
                      unit: "cards",
                    },
                  },
                },
                count: 1,
              },
              to: "hand",
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-032", compiled);
