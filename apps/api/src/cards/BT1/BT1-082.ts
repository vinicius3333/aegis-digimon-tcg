// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          actions: [
            {
              kind: "Suspend",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
              condition: { kind: "allOf", conditions: [{ kind: "selfIsSuspended" }, { kind: "attackTargetsPlayer" }] },
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT1-082", compiled);
export default compiled;
