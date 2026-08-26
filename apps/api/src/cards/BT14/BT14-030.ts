// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const bounce = {
  kind: "Return",
  target: {
    filter: {
      controller: "opponent",
      kind: ["Digimon"],
      levelLte: "returned",
    },
    count: 1,
  },
  to: "hand",
  cost: {
    kind: "return",
    target: {
      filter: { controller: "opponent", kind: ["Digimon"], levels: [3] },
      count: 1,
      orFilters: [{ controllerDefault: "mine", kind: ["Digimon"] }],
    },
    raw: "By returning 1 of your opponent's level 3 Digimon or 1 of your Digimon to the hand",
    storeAs: "returned",
  },
  optional: true,
  abortOnDecline: true,
  allowCostWithoutTarget: true,
};

export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: [bounce] },
    { trigger: "WhenDigivolving", actions: [bounce] },
    {
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDigimonReturnsToHand",
          sourceFilter: { controller: "any", kind: ["Digimon"], excludeSelf: true },
          actions: [{ kind: "SecurityManipulation", op: "addTop", controller: "mine", source: "deck", amount: 1 }],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT14-030", compiled);
