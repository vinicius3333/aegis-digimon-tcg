import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "Trash",
          target: {
            filter: {
              controller: "mine",
              zone: "deck",
            },
            count: 1,
          },
          scaling: {
            per: 1,
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            unit: "colors",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT18-006", compiled);
