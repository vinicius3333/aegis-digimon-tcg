import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigivolutionCardsDiscardedBatch",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          requireByEffect: true,
          actions: [
            {
              kind: "Draw",
              controller: "mine",
              amount: 1,
              condition: {
                kind: "selfHasTrait",
                filter: { nameOrTrait: [{ tokens: ["ALYSION"], match: "trait" }] },
                raw: "this Digimon has the [ALYSION] trait",
              },
            },
          ],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BD02-01", compiled);
