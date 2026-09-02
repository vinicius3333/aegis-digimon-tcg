import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", kind: ["Digimon"], levels: [3], colors: ["Yellow"] },
          actions: [{ kind: "Draw", controller: "mine", amount: 1, condition: { kind: "selfIsSuspended" } }],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT1-053", compiled);
export default compiled;
