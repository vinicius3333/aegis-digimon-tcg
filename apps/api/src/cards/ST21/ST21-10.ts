import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          effectTextPart: "[When Attacking] [Once Per Turn] ＜Draw 1＞.",
          kind: "Draw",
          controller: "mine",
          amount: 1,
        },
        {
          effectTextPart: "Then, trash 1 card in your hand.",
          kind: "Trash",
          target: {
            filter: {
              controller: "mine",
              zone: "hand",
            },
            count: 1,
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  baseGrantedDigivolve: [
    {
      target: { namesExact: ["MetalGarurumon"] },
      cost: 4,
      ignoreRequirements: true,
      condition: {
        kind: "anyOf",
        conditions: [
          { kind: "opponentHasDigimonDpAtLeast", dp: 10000 },
          { kind: "tamerColorCountAtLeast", count: 3 },
        ],
      },
    },
  ],
  digivolutionRequirement: [
    {
      level: 2,
      traits: ["ADVENTURE"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("ST21-10", compiled);
