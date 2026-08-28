import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          source: {
            filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"], colors: ["Yellow"] },
            count: 1,
          },
          toTop: true,
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT11-039", compiled);
