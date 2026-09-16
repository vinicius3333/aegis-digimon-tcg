import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          scaling: {
            per: 4,
            filter: {
              zone: "hand",
              controller: "opponent",
            },
            unit: "cards",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          grant: "unblockable",
          tokens: [],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT4-035", compiled);
