// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", unsuspended: true, kind: ["Digimon"], levels: [4] }, count: 1 },
        },
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", unsuspended: true, kind: ["Digimon"], levels: [5] }, count: 1 },
        },
      ],
    },
    { trigger: "Security", actions: [{ kind: "ActivateMain" }], isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT5-108", compiled);
