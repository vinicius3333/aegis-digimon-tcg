import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              colors: ["Yellow"],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          condition: {
            kind: "totalSecurityCount",
            op: "lte",
            value: 6,
            raw: "there're 6 or fewer total cards in both players' security stacks",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -2000,
          duration: "forTheTurn",
          condition: {
            kind: "totalSecurityCount",
            op: "lte",
            value: 6,
            raw: "there're 6 or fewer total cards in both players' security stacks",
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX5-028", compiled);
