// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 1000,
          duration: "forTheTurn",
          condition: { kind: "selfHasKeyword", keyword: "Blocker" },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST5-01", compiled);
