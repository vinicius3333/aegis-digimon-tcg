import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GrantAuraToOpponents",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          effectText: "[On Deletion] Lose 1 memory.",
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 3000 } }, count: 1 },
          condition: { kind: "selfHasNameContaining", names: ["Greymon"] },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BD03-02", compiled);
