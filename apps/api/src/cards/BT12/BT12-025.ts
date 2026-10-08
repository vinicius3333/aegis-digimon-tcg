import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "TamerOntoDigivolve",
          onto: {
            controller: "mine",
            kind: ["Tamer"],
            colors: ["Blue"],
          },
          asLevel: 3,
          from: ["hand"],
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Blue"],
              levels: [3],
              hostFilter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                colors: ["Blue"],
              },
            },
            count: 1,
          },
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Lanamon"],
      cost: 1,
      isAlternate: true,
    },
    {
      cost: 3,
      isAlternate: true,
      baseIsTamer: true,
      baseColors: ["Blue"],
    },
  ],
};

const module = registerIrCard("BT12-025", compiled);

export default module;
