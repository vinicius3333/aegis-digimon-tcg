import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

/** Hand-audited IR: the generic Delete ceiling consumer counts qualifying Digimon in this stack. */
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Rush", raw: "＜Rush＞" }],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 3000 } },
            count: 1,
          },
          dpCeilingScaling: {
            per: 1,
            amount: 2000,
            unit: "digivolutionCards",
            filter: { kind: ["Digimon"], traitContains: ["Dragon", "saur", "Ceratopsian"] },
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digiXrosRequirement: [
    {
      count: 2,
      maxMaterials: 5,
      materials: [
        {
          traitContains: ["Dragon", "saur", "Ceratopsian"],
          differentNames: true,
        },
      ],
    },
  ],
};

registerIrCard("EX3-014", compiled);
export default compiled;
