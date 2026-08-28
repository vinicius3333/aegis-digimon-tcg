// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnDeletion",
      isInherited: true,
      actions: [{ kind: "TrashTopDeck", controller: "mine", amount: 2 }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST6-01", compiled);
