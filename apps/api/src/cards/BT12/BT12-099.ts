import type { CompiledCard, Filter, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const hybrid: Target = {
  filter: {
    controller: "mine",
    kind: ["Digimon"],
    nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }],
  },
  count: 1,
  bindAs: "bt12_099_hybrid",
};
const opposingSixThousand: Filter = {
  controller: "opponent",
  kind: ["Digimon"],
  dp: { op: "lte", value: 6000 },
};

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        { kind: "Delete", target: { filter: opposingSixThousand, count: 1 } },
        { kind: "SelectBind", target: hybrid },
        {
          kind: "ModifyDP",
          target: { filter: {}, count: 1, fromSelectionRef: "bt12_099_hybrid" },
          amount: 3000,
          duration: "forTheTurn",
        },
        {
          kind: "Attack",
          target: { filter: {}, count: 1, fromSelectionRef: "bt12_099_hybrid" },
          attackPlayer: true,
          optional: true,
        },
      ],
    },
    {
      trigger: "Security",
      actions: [{ kind: "Delete", target: { filter: opposingSixThousand, count: 1 } }],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

export default registerIrCard("BT12-099", compiled);
