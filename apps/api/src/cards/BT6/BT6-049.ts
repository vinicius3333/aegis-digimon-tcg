import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          onto: { kind: ["Tamer"], colors: ["Green"] },
          payCost: true,
          asLevel: 3,
          from: ["hand"],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT6-049", compiled);
