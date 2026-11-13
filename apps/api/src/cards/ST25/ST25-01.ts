import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import { registerIrCard } from "#api/engine/effects/interpreter";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 3000,
          duration: "permanent",
          condition: {
            kind: "allOf",
            conditions: [
              { kind: "memoryAtLeast", value: 3, controller: "opponent" },
              { kind: "selfTopHasText", filter: { nameOrTrait: [{ tokens: ["Gemmon"], match: "text" }] } },
            ],
            raw: "your opponent has 3 or more memory and this Digimon has [Gemmon] in its text",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST25-01", compiled);
