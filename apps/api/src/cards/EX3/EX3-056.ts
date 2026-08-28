// HAND-VERIFIED IR for EX3-056 Guilmon — preserve the delete-outcome branch.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// The shared interpreter executes this reviewed IR; removing the generated header
// keeps the compiler from overwriting the verified conditional behavior.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnDeletion",
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
        },
        {
          kind: "ConditionalBranch",
          condition: {
            kind: "ifThisEffectDidNotDelete",
            raw: "no Digimon was deleted by this effect",
          },
          ifTrue: [
            {
              kind: "TrashTopDeck",
              controller: "both",
              amount: 2,
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Gigimon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX3-056", compiled);
