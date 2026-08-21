// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "MaterialSave", amount: 1, raw: "＜Material Save 1＞" }] },
    {
      trigger: "OnPlay",
      actions: [
        { kind: "ModifyDP", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, amount: -3000, duration: "forTheTurn" },
        { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 2000 } }, count: 1 }, condition: { kind: "digiXrosCount", minimum: 2, raw: "DigiXrosing with 2 cards" } },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digiXrosRequirement: [{ materials: [{ names: ["Shoutmon"] }], count: 1 }],
};

registerIrCard("BT11-009", compiled);
