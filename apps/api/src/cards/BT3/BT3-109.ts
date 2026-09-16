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
          gainedTrigger: "onDeletionOf",
          gainedActions: [
            {
              kind: "GrantStatic",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              grant: "effects",
              tokens: ["OnDeletionPlaySelfNoOnPlay"],
              duration: "forTheTurn",
            },
          ],
          duration: "forTheTurn",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT3-109", compiled);
export default compiled;
