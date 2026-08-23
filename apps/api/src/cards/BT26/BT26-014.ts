// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const delete7000 = {
  kind: "Delete",
  target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 7000 } } },
};
const playTb = {
  kind: "PlayWithoutCost",
  from: ["hand"],
  payCost: false,
  optional: true,
  target: {
    count: 1,
    filter: {
      controller: "mine",
      kind: ["Digimon"],
      dp: { op: "lte", value: 6000 },
      nameOrTrait: [{ tokens: ["TB"], match: "trait" }],
    },
  },
};

export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: [delete7000] },
    { trigger: "WhenDigivolving", actions: [delete7000] },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "Return",
          to: "hand",
          target: {
            count: 1,
            filter: { zone: "trash", controller: "mine", nameOrTrait: [{ tokens: ["Shambala"], match: "trait" }] },
          },
          optional: true,
        },
        playTb,
      ],
    },
    { trigger: "OnDeletion", isInherited: true, actions: [playTb] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-014", compiled);
