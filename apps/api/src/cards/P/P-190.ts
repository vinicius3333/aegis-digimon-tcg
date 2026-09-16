import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      isLinked: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          on: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 2,
      traits: ["Appmon"],
      cost: 0,
      isAlternate: true,
    },
  ],
  linkRequirement: [{ cost: 1, traits: ["Appmon"] }],
};

registerIrCard("P-190", compiled);
