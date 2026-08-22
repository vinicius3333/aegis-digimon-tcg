import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          keyword: { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
          duration: "permanent",
          scaling: { per: 2, filter: {}, unit: "digivolutionCards" },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST1-11", compiled);
