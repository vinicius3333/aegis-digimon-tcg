// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          cost: {
            kind: "trash",
            target: {
              count: 1,
              filter: {
                zone: "hand",
                controller: "mine",
                nameOrTrait: [
                  { tokens: ["Ghost"], match: "trait" },
                  { tokens: ["NSo"], match: "trait" },
                ],
              },
            },
          },
          optional: true,
          abortOnDecline: true,
        },
        { kind: "GainMemory", amount: 1 },
      ],
    },
    {
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "ModifyDP", target: { isSelf: true }, amount: 2000, duration: "forTheTurn" }],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 2, traits: ["NSo"], cost: 0, isAlternate: true }],
};
registerIrCard("BT26-062", compiled);
