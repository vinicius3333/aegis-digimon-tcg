import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenMovedFromBreeding",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Lucemon"], match: "name" }],
          },
          actions: [
            {
              kind: "Draw",
              controller: "mine",
              amount: 1,
              optional: true,
              abortOnDecline: true,
              cost: {
                kind: "trash",
                target: { filter: { controller: "mine", zone: "hand" }, count: 1 },
                raw: "By trashing 1 card in your hand",
              },
            },
            // "＜Draw 1＞ AND gain 1 memory" are both results of the same paid processing
            // condition; the printed text has no "if you do" between them. Declining or
            // failing the hand-trash cost aborts the Draw with `abortOnDecline`, which stops
            // this sequence before the memory gain, so no extra gate is needed — and gating on
            // `ifThisEffectActed` would wrongly withhold the memory when the deck is empty.
            {
              kind: "GainMemory",
              amount: 1,
            },
          ],
          raw: "When one of your Digimon with [Lucemon] in its name moves from breeding to battle",
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

export { compiled };

registerIrCard("EX10-004", compiled);
