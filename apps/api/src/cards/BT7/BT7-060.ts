import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// "You may digivolve this card from your hand onto one of your black Tamers as if
// the Tamer is a level 3 black Digimon." — alternate digivolution onto a Tamer;
// captured entirely by digivolutionRequirement; no separate active effect.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Digivolve",
          target: { filter: { controller: "mine", kind: ["Tamer"], colors: ["Black"] }, count: 1 },
          payCost: true,
          asLevel: 3,
          from: ["hand"],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      cost: 2,
      isAlternate: true,
      baseIsTamer: true,
      baseColors: ["Black"],
    },
  ],
};

registerIrCard("BT7-060", compiled);
