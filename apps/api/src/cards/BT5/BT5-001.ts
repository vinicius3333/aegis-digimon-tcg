import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: {
            kind: "allOf",
            conditions: [
              { kind: "selfHasNameContaining", names: ["Omnimon", "Greymon"] },
              {
                kind: "not",
                condition: {
                  kind: "selfHasName",
                  names: ["DoruGreymon", "BurningGreymon", "DexDoruGreymon"],
                },
              },
            ],
            raw: "this Digimon has [Omnimon] or [Greymon] other than [DoruGreymon], [BurningGreymon], or [DexDoruGreymon] in its name",
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

registerIrCard("BT5-001", compiled);
