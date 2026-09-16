import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              zone: "hand",
              or: [
                {
                  kind: ["Tamer"],
                  colors: ["Green"],
                },
                {
                  kind: ["Digimon"],
                  levels: [3],
                  nameOrTrait: [
                    {
                      tokens: ["Lopmon"],
                      match: "name",
                    },
                  ],
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: true,
          reduceCostBy: 2,
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "modifyDP",
            amount: 1000,
          },
          while: {
            kind: "selfIsSuspended",
            raw: "this Digimon is suspended",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Gummymon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("ST17-02", compiled);
