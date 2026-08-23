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
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: { isSelfRef: true, controller: "mine", kind: ["Digimon"] },
          actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "triggerSourceNotDeletedAtSameTiming" } }],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT1-077", compiled);
export default compiled;
