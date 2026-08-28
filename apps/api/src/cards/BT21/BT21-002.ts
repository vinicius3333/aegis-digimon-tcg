// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: {
            kind: "anyOf",
            conditions: [
              { kind: "selfTopHasText", filter: { nameOrTrait: [{ tokens: ["Gammamon"], match: "text" }] } },
              { kind: "selfHasTrait", filter: { nameOrTrait: [{ tokens: ["Hero"], match: "trait" }] } },
            ],
            raw: "this Digimon has [Gammamon] in its text or the [Hero] trait",
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

registerIrCard("BT21-002", compiled);
