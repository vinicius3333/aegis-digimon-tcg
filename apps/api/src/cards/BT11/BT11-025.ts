// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttacking",
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
              condition: {
                kind: "allOf",
                conditions: [
                  { kind: "isYourTurn" },
                  {
                    kind: "zoneCount",
                    seat: "opponent",
                    zone: "hand",
                    op: "gte",
                    value: 8,
                    raw: "your opponent has 8 or more cards in their hand",
                  },
                ],
              },
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Return",
          target: { filter: { controller: "opponent", kind: ["Digimon"], levels: [3] }, count: 1 },
          to: "hand",
          condition: {
            kind: "allOf",
            conditions: [
              { kind: "isYourTurn" },
              {
                kind: "youHave",
                filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Tamer"] },
                raw: "you have a Tamer in play",
              },
            ],
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-025", compiled);
