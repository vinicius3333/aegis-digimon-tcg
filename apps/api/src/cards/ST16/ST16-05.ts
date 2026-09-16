import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Retaliation", raw: "＜Retaliation＞" }],
    },
    {
      trigger: "WhenAttacking",
      actions: [{ kind: "GainMemory", amount: -2 }],
      condition: {
        kind: "allOf",
        conditions: [
          { kind: "isYourTurn" },
          { kind: "triggerAttackerIsSelf" },
          { kind: "not", condition: { kind: "attackTargetsPlayer" } },
        ],
        raw: "this Digimon attacks an opponent's Digimon during your turn",
      },
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST16-05", compiled);
export { compiled };
