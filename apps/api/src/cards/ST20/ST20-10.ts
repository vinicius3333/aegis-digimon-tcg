import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Reboot",
          raw: "＜Reboot＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  baseGrantedDigivolve: [
    {
      target: { namesExact: ["WarGreymon"] },
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
      traits: ["ADVENTURE", "Hero"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("ST20-10", compiled);
