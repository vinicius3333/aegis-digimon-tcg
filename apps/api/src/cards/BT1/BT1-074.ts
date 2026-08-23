// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [{ filter: { kind: ["Digimon"], levelComparison: { op: "gte", value: 5 } }, count: 1, to: "hand" }],
          rest: "deckBottomAnyOrder",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-074", compiled);
export default compiled;
