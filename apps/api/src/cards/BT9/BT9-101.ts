import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Return",
          target: {
            count: 1,
            filter: {
              controller: "opponent",
              suspended: true,
              kind: ["Digimon"],
            },
          },
          to: "deckBottom",
        },
        {
          kind: "Return",
          target: {
            count: 1,
            filter: {
              controller: "opponent",
              suspended: true,
              kind: ["Tamer"],
            },
          },
          to: "deckBottom",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "ActivateMain",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT9-101", compiled);
