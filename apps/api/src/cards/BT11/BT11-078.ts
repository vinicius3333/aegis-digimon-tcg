// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Retaliation", raw: "＜Retaliation＞" }] },
    {
      trigger: "AllTurns",
      actions: [{
        kind: "ModifyDP",
        target: { filter: { controller: "mine", kind: ["Digimon"], keywords: ["Retaliation"] }, count: "all" },
        amount: 2000,
        duration: "permanent",
      }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-078", compiled);
