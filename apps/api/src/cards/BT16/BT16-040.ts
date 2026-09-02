import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          into: {
            controller: "mine",
            zone: "trash",
            kind: ["Digimon"],
            levels: [4],
            nameOrTrait: [
              {
                tokens: ["Insectoid", "Free"],
                match: "trait",
              },
            ],
          },
          from: ["trash"],
          reduceCost: 1,
          payCost: true,
          optional: true,
          condition: {
            kind: "isYourTurn",
            raw: "it's your turn",
          },
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          into: {
            controller: "mine",
            zone: "trash",
            kind: ["Digimon"],
            levels: [4],
            nameOrTrait: [
              {
                tokens: ["Insectoid", "Free"],
                match: "trait",
              },
            ],
          },
          from: ["trash"],
          reduceCost: 1,
          payCost: true,
          optional: true,
          condition: {
            kind: "isYourTurn",
            raw: "it's your turn",
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
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
  digivolutionRequirement: [
    {
      names: ["Minomon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT16-040", compiled);
export { compiled };
