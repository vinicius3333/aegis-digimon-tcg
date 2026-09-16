import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }] },
    {
      trigger: "Static",
      actions: [
        {
          kind: "Restrict",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          restriction: "cantBeAttacked",
          duration: "permanent",
          condition: {
            kind: "allOf",
            conditions: [
              { kind: "isOpponentsTurn" },
              {
                kind: "anyOf",
                conditions: [
                  {
                    kind: "selfDigivolutionStackCountAtLeast",
                    count: 1,
                    filter: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }] },
                  },
                  {
                    kind: "selfDigivolutionStackCountAtLeast",
                    count: 1,
                    filter: { kind: ["Tamer"], colors: ["Blue"] },
                  },
                ],
              },
            ],
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT4-030", compiled);
