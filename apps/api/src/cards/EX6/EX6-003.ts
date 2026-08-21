import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored implementation for EX6-003's inherited security exchange effect.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      optional: true,
      actions: [
        {
          kind: "SecurityManipulation",
          op: "toHand",
          controller: "mine",
          amount: 1,
          toTop: true,
        },
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          source: {
            filter: {
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Angel", "Archangel", "Three Great Angels"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          toTop: false,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX6-003", compiled);
