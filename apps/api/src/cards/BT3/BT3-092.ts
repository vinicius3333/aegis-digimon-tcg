// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }] },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { excludeSelf: true, kind: ["Digimon"] },
          actions: [
            { kind: "GainMemory", amount: 1, scaling: { per: 1, filter: { deletedByTrigger: true }, unit: "cards" } },
          ],
          raw: "When another Digimon is deleted, gain 1 memory for each Digimon deleted",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT3-092", compiled);
