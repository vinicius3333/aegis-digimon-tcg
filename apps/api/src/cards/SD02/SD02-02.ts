import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "TrashDigivolution",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"] },
            count: 1,
          },
          amount: 1,
          fromTop: false,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "TrashDigivolution",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"] },
            count: 1,
          },
          amount: 1,
          fromTop: false,
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("SD02-02", compiled);
