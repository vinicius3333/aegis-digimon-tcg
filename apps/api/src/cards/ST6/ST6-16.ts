// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { controller: "mine", kind: ["Digimon"], colors: ["Purple"], levels: [3] }, count: 1 },
          from: ["trash"],
          payCost: false,
          optional: true,
          suppressOnPlayEffects: true,
        },
        {
          kind: "PlayWithoutCost",
          target: { filter: { controller: "mine", kind: ["Digimon"], colors: ["Purple"], levels: [4] }, count: 1 },
          from: ["trash"],
          payCost: false,
          optional: true,
          suppressOnPlayEffects: true,
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Purple"],
              levelComparison: { op: "lte", value: 4 },
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
          suppressOnPlayEffects: true,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST6-16", compiled);
