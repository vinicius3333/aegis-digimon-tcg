import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const drawByTrashing: Action = {
  kind: "Draw",
  controller: "mine",
  amount: 2,
  optional: true,
  abortOnDecline: true,
  cost: {
    kind: "trash",
    target: {
      filter: {
        zone: "hand",
        controller: "mine",
        nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
      },
      count: 1,
    },
    raw: "By trashing 1 card with [Dracomon] or [Examon] in its text from your hand",
  },
};

const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: [drawByTrashing] },
    { trigger: "WhenDigivolving", actions: [drawByTrashing] },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            excludeSelf: true,
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
          },
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: { isSelfRef: true },
                count: 1,
                isSelf: true,
              },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Examon"], match: "text" }],
              },
              from: ["hand"],
              payCost: true,
              reduceCost: 2,
              optional: true,
            },
          ],
          raw: "When any of your other Digimon with [Dracomon] or [Examon] in their texts are played, this Digimon may digivolve into a Digimon card with [Examon] in its text in the hand with the cost reduced by 2",
        },
      ],
    },
    {
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 2000,
          duration: "permanent",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 3, names: ["Dracomon"], cost: 2, isAlternate: true }],
};

export { compiled };

registerIrCard("EX13-018", compiled);
