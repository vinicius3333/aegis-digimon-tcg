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
              filter: { zone: "hand", controller: "mine", nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] },
              count: 1,
            },
            raw: "By trashing 1 card with the [Appmon] trait from your hand",
          },
          optional: true,
          abortOnDecline: true,
        },
        { kind: "GainMemory", amount: 1 },
      ],
    },
    {
      trigger: "Static",
      isLinked: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Restrict",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
              restriction: "unsuspend",
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 2, traits: ["Appmon"], cost: 0, isAlternate: true }],
  linkRequirement: [{ traits: ["Appmon"], cost: 1 }],
};

registerIrCard("BT25-061", compiled);
