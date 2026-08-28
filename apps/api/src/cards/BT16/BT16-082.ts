// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenMovedFromBreeding",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [
            {
              kind: "RevealAdd",
              revealCount: 3,
              add: [{ filter: { kind: ["Digimon", "Tamer"] }, count: 1, to: "hand" }],
              rest: "deckBottom",
            },
            { kind: "Hatch", optional: true },
          ],
          raw: "when one of your Digimon moves from breeding to battle",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT16-082", compiled);
