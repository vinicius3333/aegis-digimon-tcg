// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "EndOfOpponentsTurn",
      isInherited: true,
      actions: [
        { kind: "Draw", controller: "mine", amount: 1, condition: { kind: "opponentDidNotAttackWithDigimonThisTurn" } },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST5-06", compiled);
