import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAddSecurity",
          fireCondition: {
            kind: "allOf",
            conditions: [
              { kind: "triggerSecurityIsYours" },
              {
                kind: "triggerAddedSecurityHasTrait",
                filter: {
                  nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }],
                },
              },
            ],
          },
          actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

export default registerIrCard("EX11-003", compiled);
