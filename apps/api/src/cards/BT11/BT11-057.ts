// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }] },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Trash",
          target: { filter: { zone: "hand", controller: "mine" }, count: 3, upTo: true },
          optional: true,
          trackCount: "titamonTrashedCards",
        },
        {
          kind: "Suspend",
          target: { filter: { controller: "opponent", kind: ["Digimon"], suspended: false }, count: 1 },
          scaling: { per: 1, unit: "namedCount", countSource: "titamonTrashedCards" },
        },
        {
          kind: "GainMemory",
          amount: 1,
          scaling: {
            per: 1,
            filter: { zone: "battleArea", controller: "opponent", suspended: true, kind: ["Digimon"] },
            unit: "cards",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT11-057", compiled);
