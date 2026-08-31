// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [{ filter: { controllerDefault: "mine", kind: ["Tamer"] }, count: 1, to: "play", optional: true }],
          rest: "deckTopOrBottom",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 1,
          add: [
            {
              filter: { controllerDefault: "mine", kind: ["Digimon"], colors: ["Green", "Black"] },
              count: 10,
              to: "play",
              optional: true,
              totalPlayCostBudget: 10,
            },
          ],
          rest: "deckBottom",
          scaling: {
            per: 1,
            filter: {
              or: [
                { zone: "battleArea", controller: "mine", kind: ["Tamer"], colors: ["Green"] },
                { zone: "battleArea", controller: "mine", kind: ["Tamer"], colors: ["Black"] },
              ],
            },
            unit: "cards",
          },
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT11-056", compiled);
