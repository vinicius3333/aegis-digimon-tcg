// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Trash",
          target: { filter: { zone: "hand", controller: "mine", kind: ["Digimon"], colors: ["Red"] }, count: 1 },
          optional: true,
          bindResultAs: "trashedRedDigimon",
        },
        {
          kind: "AddDPFromTrashedCard",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          duration: "forTheTurn",
          from: "trashedRedDigimon",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT5-018", compiled);
