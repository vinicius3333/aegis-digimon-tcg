import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "GainTriggeredEffect",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          gainedTrigger: "whenDeletesInBattle",
          gainedActions: [
            {
              kind: "Unsuspend",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            },
          ],
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [{ kind: "AddToHandSelf" }],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT1-112", compiled);
export default compiled;
