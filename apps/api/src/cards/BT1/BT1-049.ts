import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          fireCondition: {
            kind: "allOf",
            conditions: [{ kind: "triggerDeletedByDpZero" }, { kind: "triggerIsFirstDeletedPermanent" }],
          },
          actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT1-049", compiled);
export default compiled;
