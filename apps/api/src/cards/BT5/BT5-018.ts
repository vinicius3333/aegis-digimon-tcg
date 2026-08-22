// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "AddDPFromTrashedCard",
          cost: {
            kind: "trash",
            target: { filter: { zone: "hand", controller: "mine", kind: ["Digimon"], colors: ["Red"] }, count: 1 },
          },
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          duration: "forTheTurn",
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT5-018", compiled);
