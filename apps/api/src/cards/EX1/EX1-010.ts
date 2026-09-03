// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "SecurityAttack", amount: 1 }] },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 2,
          condition: { kind: "attackTargetsPlayer", raw: "when this Digimon attacks a player" },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX1-010", compiled);
