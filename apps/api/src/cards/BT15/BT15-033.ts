import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          leaveCause: "byBattle",
          sourceFilter: { isSelfRef: true },
          mode: "prevent",
          actions: [],
          cost: {
            kind: "trashSecurityTop",
            raw: "By trashing the top card of your security stack, prevent that deletion",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT15-033", compiled);
export { compiled };
