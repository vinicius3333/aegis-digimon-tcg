import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "eq", value: 3 } },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [{ keyword: "Retaliation", raw: "＜Retaliation＞" }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BD02-07", compiled);
