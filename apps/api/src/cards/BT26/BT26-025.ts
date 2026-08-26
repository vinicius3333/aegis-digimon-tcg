// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const placeAndRecover = [
  {
    kind: "SecurityManipulation",
    op: "addTop",
    controller: "mine",
    source: "deck",
    amount: 1,
    optional: true,
    cost: {
      kind: "place",
      target: {
        count: 1,
        filter: { zone: "security", controller: "mine", position: "top" },
        from: ["security"],
      },
      destination: "digivolutionStack",
      position: "bottom",
      host: "target",
      underFilter: { controller: "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }] },
      faceDown: true,
    },
  },
];
export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: placeAndRecover },
    { trigger: "WhenMoving", actions: placeAndRecover },
    {
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        { kind: "SecurityManipulation", op: "toHand", controller: "mine", amount: 1, optional: true },
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          source: "deck",
          amount: 1,
          condition: { kind: "securityAtMost", controller: "mine", value: 0 },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 2, traits: ["Glowing Dawn"], cost: 0, isAlternate: true }],
};
registerIrCard("BT26-025", compiled);
