// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          from: ["security"],
          payCost: false,
          withoutBattle: true,
        },
        {
          kind: "SubTrigger",
          event: "endOfTurn",
          once: true,
          actions: [
            {
              kind: "Return",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              to: "hand",
            },
          ],
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 6000,
              },
            },
            count: 1,
          },
        },
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          preventUnsuspend: "opponentNextUnsuspendPhase",
          condition: {
            kind: "ifThisEffectDidNotDelete",
            raw: "no Digimon was deleted by this effect",
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 6000,
              },
            },
            count: 1,
          },
        },
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          preventUnsuspend: "opponentNextUnsuspendPhase",
          condition: {
            kind: "ifThisEffectDidNotDelete",
            raw: "no Digimon was deleted by this effect",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX4-013", compiled);
