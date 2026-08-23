// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Text: [On Play] Reveal the top 3 cards of your deck. Add 1 Digimon card with [Garurumon]
// in its name and 1 Digimon card with [Agumon], [Greymon], or [Omnimon] in its name among
// them to your hand. Place the rest on top of your deck in any order.
// KB Q3488: you can add 1 card if only 1 type is revealed.
// KB Q3489: if both are present, you must add both (mandatory).
// Fix: rest → deckTop (not deckBottom as the old IR had).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Garurumon"],
                    match: "name",
                  },
                ],
              },
              count: 1,
              to: "hand",
            },
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Agumon", "Greymon", "Omnimon"],
                    match: "name",
                  },
                ],
              },
              count: 1,
              to: "hand",
            },
          ],
          rest: "deckTop",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: { controller: "mine", kind: ["Digimon"], excludeSelf: true },
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
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

registerIrCard("EX4-039", compiled);
