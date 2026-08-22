// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "revealTop",
          controller: "opponent",
          source: "security",
        },
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: {
            kind: "triggerRevealedMatchesFilter",
            filter: { kind: ["Digimon"] },
            raw: "the revealed card is a Digimon card",
          },
        },
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "opponent",
          source: "revealed",
          faceDown: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-078", compiled);
