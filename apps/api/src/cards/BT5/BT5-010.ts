import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "selfHasInDigivolutionCards",
            nameOrTrait: [
              {
                tokens: ["Agumon"],
                match: "nameExact",
              },
            ],
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "modifyDP",
            amount: 2000,
          },
          while: {
            kind: "allOf",
            conditions: [
              {
                kind: "selfHasNameContaining",
                names: ["Omnimon", "Greymon"],
              },
              {
                kind: "not",
                condition: {
                  kind: "selfHasName",
                  names: ["DoruGreymon", "BurningGreymon", "DexDoruGreymon"],
                },
              },
            ],
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT5-010", compiled);
