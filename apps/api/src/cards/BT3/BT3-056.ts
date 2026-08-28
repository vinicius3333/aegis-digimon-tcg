import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          mode: "reduceCost",
          amount: 3,
          cost: {
            kind: "suspend",
            target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
            optional: true,
          },
          raw: "＜Digisorption -3＞",
        },
      ],
      keywords: [{ keyword: "Digisorption", amount: -3, raw: "＜Digisorption -3＞" }],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "digisorptionRedirect",
          raw: "When suspending Digimon for a ＜Digisorption＞ skill, you may suspend your opponent's Digimon instead",
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT3-056", compiled);
export default compiled;
