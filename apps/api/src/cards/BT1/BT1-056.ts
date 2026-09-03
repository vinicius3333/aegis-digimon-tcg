import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      optional: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
          target: {
            filter: { controller: "mine", nameOrTrait: [{ tokens: ["Tinkermon"], match: "nameExact" }] },
            count: 1,
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-056", compiled);
export default compiled;
