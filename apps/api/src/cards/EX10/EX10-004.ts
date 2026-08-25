// @ts-nocheck
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
            {
              kind: "GainMemory",
              amount: 1,
              condition: { kind: "ifThisEffectActed", raw: "if you did" },
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
