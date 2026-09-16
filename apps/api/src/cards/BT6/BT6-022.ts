import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "selfHasTrait",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["Hybrid", "Ten Warriors"],
                  match: "trait",
                },
              ],
            },
            raw: "this Digimon has [Hybrid] or [Ten Warriors] in its form or type",
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

registerIrCard("BT6-022", compiled);
