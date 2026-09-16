import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 3000,
              },
            },
            count: 1,
          },
          condition: {
            kind: "anyOf",
            conditions: [
              { kind: "selfHasNameContaining", names: ["Tyrannomon"] },
              { kind: "selfHasTrait", filter: { nameOrTrait: [{ tokens: ["Dinosaur"], match: "trait" }] } },
            ],
            raw: "this Digimon has [Tyrannomon] in its name or the [Dinosaur] trait",
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

registerIrCard("EX8-001", compiled);
