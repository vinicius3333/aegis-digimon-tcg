// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          digivolveOption: {
            into: { controllerDefault: "mine", kind: ["Digimon"], colors: ["Green"], levels: [6] },
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            payCost: false,
            optional: true,
          },
          add: [],
          rest: "deckBottomAnyOrder",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT1-078", compiled);
export default compiled;
