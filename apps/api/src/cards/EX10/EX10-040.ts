import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "TrashTopDeck",
          controller: "both",
          amount: 2,
          condition: {
            kind: "zoneCount",
            seat: "opponent",
            zone: "trash",
            op: "lte",
            value: 10,
            raw: "your opponent has 10 or fewer cards in their trash",
          },
        },
        {
          effectTextPart: "Then, if they have 10 or more cards in their trash, gain 1 memory.",
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "zoneCount",
            seat: "opponent",
            zone: "trash",
            op: "gte",
            value: 10,
            raw: "they have 10 or more cards in their trash",
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "TrashTopDeck",
          controller: "both",
          amount: 1,
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX10-040", compiled);

export { compiled };
