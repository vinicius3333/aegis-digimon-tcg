// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      attackScope: "ally",
      actions: [{ kind: "RevealAdd", revealCount: 1, add: [], rest: "deckTopOrBottom" }],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-004", compiled);
