import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      condition: {
        kind: "youHave",
        filter: {
          nameOrTrait: [
            {
              tokens: ["Calumon", "Takato Matsuki"],
              match: "nameExact",
            },
          ],
          controller: "mine",
          zone: "battleArea",
        },
        count: 1,
        matchPredicate: "HasPermanentsCondition",
      },
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
        },
      ],
    },
    {
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "DeletionMaxDpModifier",
          amount: 2000,
          scope: "self",
          duration: "permanent",
          condition: {
            kind: "memoryAtMost",
            value: 0,
            controller: "mine",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT19-007", compiled);
