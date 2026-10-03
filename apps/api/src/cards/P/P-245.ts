import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "EndOfAllTurns",
      actions: [
        {
          kind: "ConditionalBranch",
          condition: {
            kind: "handAtMost",
            value: 7,
            raw: "if your hand has 7 or fewer cards",
          },
          cost: {
            kind: "suspend",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                colors: ["Black"],
                keywords: ["Blocker"],
              },
              count: 1,
            },
            raw: "By suspending 1 of your black Digimon with ＜Blocker＞",
          },
          optional: true,
          abortOnDecline: true,
          ifTrue: [{ kind: "Draw", controller: "mine", amount: 1 }],
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

registerIrCard("P-245", compiled);
