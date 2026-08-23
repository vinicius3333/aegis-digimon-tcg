// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Red"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
            },
            count: 1,
            from: ["hand"],
          },
          underFilter: {
            controller: "mine",
            kind: ["Digimon"],
          },
          position: "bottom",
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "Draw",
          controller: "mine",
          amount: 2,
          condition: {
            kind: "ifThisEffectActed",
            raw: "if you do",
          },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "AddToHandSelf",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT5-094", compiled);
