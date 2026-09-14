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
        {
          effectTextPart: "[Main] Delete 1 of your opponent's Digimon with 6000 DP or less.",
          kind: "Delete",
          target: { filter: opposingSixThousand, count: 1 },
        },
        { kind: "SelectBind", target: hybrid },
        {
          effectTextPart:
            "Then, 1 of your Digimon with a [Hybrid] trait gets +3000 DP and you may attack a player with that Digimon for the turn.",
          kind: "ModifyDP",
          target: { filter: {}, count: 1, fromSelectionRef: "bt12_099_hybrid" },
          amount: 3000,
          duration: "forTheTurn",
        },
        {
          effectTextPart:
            "Then, 1 of your Digimon with a [Hybrid] trait gets +3000 DP and you may attack a player with that Digimon for the turn.",
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
