import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Thomas H. Norstein"],
                    match: "name",
                  },
                  {
                    tokens: ["DATA SQUAD"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              to: "hand",
            },
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Gaogamon"],
                    match: "name",
                  },
                ],
              },
              count: 1,
              to: "hand",
            },
          ],
          rest: "deckBottom",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Draw",
          amount: 1,
          controller: "mine",
        },
        {
          kind: "Draw",
          amount: 1,
          controller: "opponent",
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Wanyamon"],
      cost: 0,
      isAlternate: true,
    },
    {
      level: 2,
      traits: ["DATA SQUAD"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT25-021", compiled);
