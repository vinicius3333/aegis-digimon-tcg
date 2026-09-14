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
        {
          effectTextPart: "[Main] Delete 1 of your opponent's Digimon.",
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        },
        {
          effectTextPart:
            "Then, unsuspend 1 of your [Shoutmon X7: Superior Mode] cards, and you may attack a player with that Digimon.",
          kind: "Unsuspend",
          target: shoutmonX7,
        },
        {
          effectTextPart:
            "Then, unsuspend 1 of your [Shoutmon X7: Superior Mode] cards, and you may attack a player with that Digimon.",
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
