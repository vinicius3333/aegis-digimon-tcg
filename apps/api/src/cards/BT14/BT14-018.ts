import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlayToken",
          tokens: [
            { name: "Amon of Crimson Flame", keywords: [{ keyword: "Rush" }] },
            { name: "Umon of Blue Thunder", keywords: [{ keyword: "Blocker" }] },
          ],
          count: 1,
          payCost: false,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayToken",
          tokens: [
            { name: "Amon of Crimson Flame", keywords: [{ keyword: "Rush" }] },
            { name: "Umon of Blue Thunder", keywords: [{ keyword: "Blocker" }] },
          ],
          count: 1,
          payCost: false,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "instead",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: {
                  controller: "mine",
                  nameOrTrait: [
                    {
                      tokens: ["Amon of Crimson Flame"],
                      match: "name",
                    },
                    {
                      tokens: ["Umon of Blue Thunder"],
                      match: "name",
                    },
                  ],
                },
                count: "all",
              },
            },
            {
              kind: "Recover",
              amount: 1,
              condition: { kind: "ifThisEffectActed" },
            },
          ],
        },
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          mode: "instead",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: {
                  controller: "mine",
                  nameOrTrait: [
                    {
                      tokens: ["Amon of Crimson Flame"],
                      match: "name",
                    },
                    {
                      tokens: ["Umon of Blue Thunder"],
                      match: "name",
                    },
                  ],
                },
                count: "all",
              },
            },
            {
              kind: "Recover",
              amount: 1,
              condition: { kind: "ifThisEffectActed" },
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT14-018", compiled);
