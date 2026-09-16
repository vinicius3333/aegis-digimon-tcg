import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Training",
          raw: "＜Training＞",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      cost: {
        kind: "place",
        target: {
          filter: {
            controller: "mine",
          },
          count: 1,
          from: ["deck"],
        },
        raw: "By placing your deck's top card face down as this Digimon's bottom digivolution card",
        destination: "digivolutionStack",
        position: "bottom",
        host: "self",
        faceDown: true,
        optional: true,
      },
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -2000,
          duration: "forTheTurn",
          scaling: {
            per: 1,
            filter: {
              controllerDefault: "mine",
            },
            unit: "selfFaceDownDigivolutionCards",
          },
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Barrier",
          raw: "＜Barrier＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 3,
      traits: ["DM"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX9-025", compiled);
