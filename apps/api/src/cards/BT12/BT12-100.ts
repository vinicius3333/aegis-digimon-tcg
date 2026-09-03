import type { CompiledCard, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const shoutmonX7: Target = {
  filter: {
    controller: "mine",
    kind: ["Digimon"],
    nameOrTrait: [{ tokens: ["Shoutmon X7: Superior Mode"], match: "nameExact" }],
  },
  count: 1,
  bindAs: "bt12_100_shoutmon_x7",
};

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } },
        { kind: "Unsuspend", target: shoutmonX7 },
        {
          kind: "Attack",
          target: { filter: {}, count: 1, fromSelectionRef: "bt12_100_shoutmon_x7" },
          attackPlayer: true,
          optional: true,
        },
      ],
    },
    {
      trigger: "Security",
      actions: [{ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } }],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

export default registerIrCard("BT12-100", compiled);
