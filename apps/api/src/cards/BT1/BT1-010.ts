import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 5,
          add: [{ filter: { kind: ["Tamer"] }, count: 1, to: "hand" }],
          rest: "deckBottomAnyOrder",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-010", compiled);
export default compiled;
