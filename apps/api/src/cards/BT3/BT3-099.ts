import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  cardId: "BT3-099",
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Restrict",
          target: { filter: { controller: "any", kind: ["Digimon"] }, count: "all" },
          restriction: "beDeletedInBattle",
          duration: "forTheTurn",
        },
      ],
    },
    { trigger: "Security", actions: [{ kind: "AddToHandSelf" }], isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT3-099", compiled);
export default compiled;
