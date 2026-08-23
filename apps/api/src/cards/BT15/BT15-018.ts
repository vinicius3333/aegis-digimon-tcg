// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "lowestDP",
            },
            count: 1,
          },
          condition: {
            kind: "memoryAtLeast",
            value: 4,
            controller: "opponent",
          },
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "EndOfOpponentsTurn",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "highestPlayCost",
            },
            count: 1,
          },
          condition: {
            kind: "memoryAtMost",
            value: 4,
            controller: "mine",
          },
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT15-018", compiled);
export { compiled };
