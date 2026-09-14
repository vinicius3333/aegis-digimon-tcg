import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], traitContains: ["Insect"] },
            count: 1,
            bindAs: "selected",
          },
        },
        {
          effectTextPart:
            "[Main] Choose 1 of your Digimon with [Insect] in one of its traits. Suspend 2 of your opponent's Digimon with DP less than or equal to the DP of the chosen Digimon.",
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              relativeTo: { selectionRef: "selected", attr: "dp", op: "lte" },
            },
            count: 2,
          },
        },
        {
          kind: "Restrict",
          target: { filter: { controller: "opponent", kind: ["Digimon"], suspended: true }, count: 1 },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [{ kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 2 } }],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-102", compiled);
